import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../services/api";
import { useAutoSave } from "../../hooks/useAutoSave";
import AutoSaveIndicator from "../../components/AutoSaveIndicator";
import CollapsibleRightSidebar from "../../components/CollapsibleRightSidebar";
import { Plus, Trash } from "lucide-react";

export default function MiscMetalsTab() {
  const { projectId, project } = useOutletContext();
  const isReadOnly = project?.is_finalized || false;
  const rateConfig = project?.rate_config || {
    stair_labor_rate: 65.00
  };

  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const { saveState, lastSaved, triggerSave } = useAutoSave();

  // Stair Flight Form State
  const [showStairForm, setShowStairForm] = useState(false);
  const [stairForm, setStairForm] = useState({
    stair_type: "picket_rail",
    quantity: 1,
    num_risers: 18,
    lf_picket: 0,
    lf_mesh: 0,
    lf_grabrail: 0,
    lf_wallrail: 0,
    num_landings: 0,
    description: "",
  });

  // Misc Item Form State
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState({
    category: "grating",
    description: "",
    quantity: 1,
    shop_rate: 0,
    field_rate: 0,
    material_rate: 0,
    unit_weight: 0,
    is_galvanized: false,
    is_anodized: false,
    is_powder_coated: false,
    is_subcontract: false,
    subcontract_amount: 0,
  });

  const fetchEstimate = async () => {
    try {
      const res = await api.get(`projects/${projectId}/misc-metals/`);
      setEstimate(res.data);
    } catch (err) {
      console.error("Failed to fetch misc metals estimate:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEstimate();
  }, [projectId]);

  const handleAddStair = async (e) => {
    e.preventDefault();
    try {
      await api.post(`projects/${projectId}/misc-metals/stairs/`, stairForm);
      setShowStairForm(false);
      // Reset form
      setStairForm({
        stair_type: "picket_rail",
        quantity: 1,
        num_risers: 18,
        lf_picket: 0,
        lf_mesh: 0,
        lf_grabrail: 0,
        lf_wallrail: 0,
        num_landings: 0,
        description: "",
      });
      fetchEstimate();
    } catch (err) {
      alert("Failed to add stair flight.");
    }
  };

  const handleDeleteStair = async (stairId) => {
    try {
      await api.delete(`projects/${projectId}/misc-metals/stairs/${stairId}/`);
      fetchEstimate();
    } catch (err) {
      alert("Failed to delete stair flight.");
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      await api.post(`projects/${projectId}/misc-metals/items/`, itemForm);
      setShowItemForm(false);
      // Reset form
      setItemForm({
        category: "grating",
        description: "",
        quantity: 1,
        shop_rate: 0,
        field_rate: 0,
        material_rate: 0,
        unit_weight: 0,
        is_galvanized: false,
        is_anodized: false,
        is_powder_coated: false,
        is_subcontract: false,
        subcontract_amount: 0,
      });

      fetchEstimate();
    } catch (err) {
      alert("Failed to add miscellaneous item.");
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await api.delete(`projects/${projectId}/misc-metals/items/${itemId}/`);
      fetchEstimate();
    } catch (err) {
      alert("Failed to delete miscellaneous item.");
    }
  };

  const handleUpdateStairQty = (stairId, fieldName, val) => {
    // Optimistic UI update
    let numericVal = parseFloat(val);
    if (isNaN(numericVal) || numericVal < 0) {
      numericVal = 0;
    }
    const updatedStairs = estimate.stair_flights.map((stair) => {
      if (stair.id === stairId) {
        return {
          ...stair,
          [fieldName]: numericVal,
        };
      }
      return stair;
    });

    setEstimate({ ...estimate, stair_flights: updatedStairs });

    if (!isReadOnly) {
      triggerSave(async () => {
        await api.patch(`projects/${projectId}/misc-metals/stairs/${stairId}/`, {
          [fieldName]: numericVal,
        });
        fetchEstimate();
      });
    }
  };

  const handleUpdateItemQty = (itemId, fieldName, val) => {
    let updatedVal = val;
    if (!fieldName.startsWith("is_")) {
      const parsed = parseFloat(val);
      updatedVal = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    }
    // Optimistic UI update
    const updatedItems = estimate.items.map((item) => {
      if (item.id === itemId) {
        return { ...item, [fieldName]: updatedVal };
      }
      return item;
    });

    setEstimate({ ...estimate, items: updatedItems });

    if (!isReadOnly) {
      triggerSave(async () => {
        await api.patch(`projects/${projectId}/misc-metals/items/${itemId}/`, {
          [fieldName]: updatedVal,
        });
        fetchEstimate();
      });
    }
  };

  if (loading) return <div className="text-center font-mono py-8 text-slate-500">Loading Misc Metals module...</div>;
  if (!estimate) return <div className="text-center font-mono py-8 text-slate-500">Estimate details missing.</div>;

  const computed = estimate.computed || {};

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full text-slate-800">
      {/* Tab Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 tracking-wider uppercase">Miscellaneous Metals</h2>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">Stairs, railings, platforms, safety cages, and bollards</p>
        </div>
        <AutoSaveIndicator state={saveState} lastSaved={lastSaved} />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 relative">
        {/* Input grids (Lhs) */}
        <div className="flex-1 min-w-0 space-y-6">
          
          {/* Stairs flights list */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase text-amber-600 tracking-wider">Stair Flights</h3>
              {!isReadOnly && (
                <button 
                  onClick={() => setShowStairForm(true)} 
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg transition-all cursor-pointer shadow-sm"
                >
                  <Plus size={12} className="text-amber-500" />
                  Add Flight
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs sm:text-sm text-slate-700">
                <thead>
                  <tr className="bg-slate-55 bg-slate-50/75 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                    <th className="px-4 py-3">Type / Description</th>
                    <th className="px-4 py-3 w-24 text-right">Qty</th>
                    <th className="px-4 py-3 w-24 text-right">Risers</th>
                    <th className="px-4 py-3 w-24 text-right">Shop Hrs</th>
                    <th className="px-4 py-3 w-24 text-right">Field Hrs</th>
                    <th className="px-4 py-3 w-24 text-right">Material</th>
                    <th className="px-4 py-3 w-28 text-right">Total ($)</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {estimate.stair_flights.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center font-mono text-slate-400">No stair flights configured.</td>
                    </tr>
                  ) : (
                    estimate.stair_flights.map((stair) => {
                      const rowComp = stair.computed || {};
                      return (
                        <tr key={stair.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800 text-xs sm:text-sm">
                              {stair.stair_type === "picket_rail" && "Stair w/ Picket Rail"}
                              {stair.stair_type === "mesh_rail" && "Stair w/ Mesh Rail"}
                              {stair.stair_type === "heavy_rail" && "Stair w/ Rail Heavy"}
                              {stair.stair_type === "ts_rail" && "Stair w/ Rail TS"}
                              {stair.stair_type === "mesh_heavy_rail" && "Stair w/ Mesh Rail Heavy"}
                              {stair.stair_type === "no_rail" && "Stair (MC12×10.6)"}
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{stair.description || "No description"}</div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex justify-end">
                              <input
                                type="number"
                                min="0"
                                disabled={isReadOnly}
                                className="bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono w-20"
                                value={stair.quantity}
                                onChange={(e) => handleUpdateStairQty(stair.id, "quantity", e.target.value)}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex justify-end">
                              <input
                                type="number"
                                min="0"
                                disabled={isReadOnly}
                                className="bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono w-20"
                                value={stair.num_risers}
                                onChange={(e) => handleUpdateStairQty(stair.id, "num_risers", e.target.value)}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500 text-xs">{rowComp.sl_hrs}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500 text-xs">{rowComp.fl_hrs}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500 text-xs">${rowComp.material_cost?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-mono text-amber-600 font-bold text-sm">
                            ${rowComp.total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDeleteStair(stair.id)}
                              disabled={isReadOnly}
                              className="text-red-500 hover:text-red-700 p-1.5 rounded transition-all"
                              title="Delete flight"
                            >
                              <Trash size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Miscellaneous Items list */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase text-amber-600 tracking-wider">Accessories / General Misc Items</h3>
              {!isReadOnly && (
                <button 
                  onClick={() => setShowItemForm(true)} 
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg transition-all cursor-pointer shadow-sm"
                >
                  <Plus size={12} className="text-amber-500" />
                  Add Accessory Item
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs sm:text-sm text-slate-700">
                <thead>
                  <tr className="bg-slate-55 bg-slate-50/75 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                    <th className="px-4 py-3">Category / Description</th>
                    <th className="px-4 py-3 w-24 text-right">Qty</th>
                    <th className="px-4 py-3 w-24 text-right">Unit Wt (lbs)</th>
                    <th className="px-4 py-3 w-24 text-right">Shop Rate</th>
                    <th className="px-4 py-3 w-24 text-right">Field Rate</th>
                    <th className="px-4 py-3 w-24 text-right">Material Rate</th>
                    <th className="px-4 py-3 w-24 text-right">Flags</th>
                    <th className="px-4 py-3 w-24 text-right">Mat. Val ($)</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {estimate.items.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-8 text-center font-mono text-slate-400">No accessory items added.</td>
                    </tr>
                  ) : (
                    estimate.items.map((item) => {
                      const rowComp = item.computed || {};
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800 text-xs sm:text-sm capitalize">{item.category}</div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{item.description}</div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex justify-end">
                              <input
                                type="number"
                                min="0"
                                disabled={isReadOnly}
                                className="bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono w-20"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItemQty(item.id, "quantity", e.target.value)}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex justify-end">
                              <input
                                type="number"
                                min="0"
                                disabled={isReadOnly}
                                className="bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono w-20"
                                value={item.unit_weight}
                                onChange={(e) => handleUpdateItemQty(item.id, "unit_weight", e.target.value)}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex justify-end">
                              <input
                                type="number"
                                min="0"
                                disabled={isReadOnly}
                                className="bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono w-20"
                                value={item.shop_rate}
                                onChange={(e) => handleUpdateItemQty(item.id, "shop_rate", e.target.value)}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex justify-end">
                              <input
                                type="number"
                                min="0"
                                disabled={isReadOnly}
                                className="bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono w-20"
                                value={item.field_rate}
                                onChange={(e) => handleUpdateItemQty(item.id, "field_rate", e.target.value)}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex justify-end">
                              <input
                                type="number"
                                min="0"
                                disabled={isReadOnly}
                                className="bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono w-20"
                                value={item.material_rate}
                                onChange={(e) => handleUpdateItemQty(item.id, "material_rate", e.target.value)}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-xs">
                            <div className="flex flex-wrap gap-1 justify-end">
                              {item.is_galvanized && <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-mono text-[9px] border border-amber-200">GALV</span>}
                              {item.is_anodized && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono text-[9px] border border-blue-200">ANOD</span>}
                              {item.is_powder_coated && <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-mono text-[9px] border border-purple-200">P.C.</span>}
                              {item.is_subcontract && <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-mono text-[9px] border border-red-200">SUB</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-600 font-semibold text-xs">${rowComp.material_value?.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              disabled={isReadOnly}
                              className="text-red-500 hover:text-red-700 p-1.5 rounded transition-all"
                              title="Delete item"
                            >
                              <Trash size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Summary sidebar */}
        <CollapsibleRightSidebar title="MISC METALS SUMMARY">
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Total Shop Hours</span>
              <span className="font-mono text-slate-800 font-bold">{computed.total_shop_hrs} hrs</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Total Field Hours</span>
              <span className="font-mono text-slate-800 font-bold">{computed.total_field_hrs} hrs</span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-100 pt-3">
              <span className="text-slate-500 font-medium">Total Material Value</span>
              <span className="font-mono text-slate-800 font-bold">${computed.total_material?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Total Subcontract</span>
              <span className="font-mono text-slate-800 font-bold">${computed.total_subcontract?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-slate-100 pt-3">
              <span className="text-slate-500 font-medium">Grating Material Value</span>
              <span className="font-mono text-slate-800 font-bold">${computed.grating_value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Anodizing Finish Value</span>
              <span className="font-mono text-slate-800 font-bold">${computed.anodizing_value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 font-medium">Galvanized Weight</span>
              <span className="font-mono text-slate-800 font-bold">{computed.galv_lbs} lbs</span>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider text-left">RUNNING TOTAL (LABOR+MAT)</span>
            <span className="text-2xl font-mono text-amber-600 font-black block mt-1 text-left">
              ${((computed.total_shop_hrs + computed.total_field_hrs) * (rateConfig?.stair_labor_rate ?? 65.00) + computed.total_material + computed.total_subcontract).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </CollapsibleRightSidebar>
      </div>

      {/* Modal - Stair Flight Builder */}
      {showStairForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <h2 className="text-md font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">Stair Flight Builder</h2>
            
            <form onSubmit={handleAddStair} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Stair Type</label>
                <select
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                  value={stairForm.stair_type}
                  onChange={(e) => setStairForm({ ...stairForm, stair_type: e.target.value })}
                >
                  <option value="picket_rail">Stair w/ Picket Rail</option>
                  <option value="mesh_rail">Stair w/ Mesh Rail</option>
                  <option value="heavy_rail">Stair w/ Rail Heavy (MC12×20.7)</option>
                  <option value="ts_rail">Stair w/ Rail TS</option>
                  <option value="mesh_heavy_rail">Stair w/ Mesh Rail Heavy (MC12×20.7)</option>
                  <option value="no_rail">Stair (MC12×10.6)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Description / Tag</label>
                <input
                  type="text"
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                  placeholder="e.g. Flight A North"
                  value={stairForm.description}
                  onChange={(e) => setStairForm({ ...stairForm, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                    value={stairForm.quantity}
                    onChange={(e) => setStairForm({ ...stairForm, quantity: Math.max(0, parseInt(e.target.value) || 0) })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Number of Risers</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                    value={stairForm.num_risers}
                    onChange={(e) => setStairForm({ ...stairForm, num_risers: Math.max(0, parseInt(e.target.value) || 0) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">LF Picket Rail</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                    value={stairForm.lf_picket}
                    onChange={(e) => setStairForm({ ...stairForm, lf_picket: Math.max(0, parseFloat(e.target.value) || 0) })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">LF Mesh Rail</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                    value={stairForm.lf_mesh}
                    onChange={(e) => setStairForm({ ...stairForm, lf_mesh: Math.max(0, parseFloat(e.target.value) || 0) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">LF Grabrail</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                    value={stairForm.lf_grabrail}
                    onChange={(e) => setStairForm({ ...stairForm, lf_grabrail: Math.max(0, parseFloat(e.target.value) || 0) })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">LF Wallrail</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                    value={stairForm.lf_wallrail}
                    onChange={(e) => setStairForm({ ...stairForm, lf_wallrail: Math.max(0, parseFloat(e.target.value) || 0) })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Number of Landings</label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                  value={stairForm.num_landings}
                  onChange={(e) => setStairForm({ ...stairForm, num_landings: Math.max(0, parseInt(e.target.value) || 0) })}
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowStairForm(false)} 
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 font-bold rounded-lg text-xs uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all shadow-sm"
                >
                  Add Stair
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Miscellaneous accessory item */}
      {showItemForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <h2 className="text-md font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">Add Accessory / Misc Item</h2>
            
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Category</label>
                <select
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                  value={itemForm.category}
                  onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                >
                  <option value="grating">Grating</option>
                  <option value="ladder">Ladders</option>
                  <option value="platform">Platforms</option>
                  <option value="safety_cage">Safety Cages</option>
                  <option value="bollard">Bollards</option>
                  <option value="hatch_frame">Hatch Frames</option>
                  <option value="railing">Railings</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Description</label>
                <input
                  type="text"
                  required
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                  placeholder="e.g. Galvanized Platform Grating"
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({ ...itemForm, quantity: Math.max(0, parseFloat(e.target.value) || 0) })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Unit Weight (lbs)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                    value={itemForm.unit_weight}
                    onChange={(e) => setItemForm({ ...itemForm, unit_weight: Math.max(0, parseFloat(e.target.value) || 0) })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Material Unit Rate ($)</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                    value={itemForm.material_rate}
                    onChange={(e) => setItemForm({ ...itemForm, material_rate: Math.max(0, parseFloat(e.target.value) || 0) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Shop Labor (hrs/unit)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                    value={itemForm.shop_rate}
                    onChange={(e) => setItemForm({ ...itemForm, shop_rate: Math.max(0, parseFloat(e.target.value) || 0) })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Field Labor (hrs/unit)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                    value={itemForm.field_rate}
                    onChange={(e) => setItemForm({ ...itemForm, field_rate: Math.max(0, parseFloat(e.target.value) || 0) })}
                  />
                </div>
              </div>

              {/* Flags */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    className="rounded border-slate-350 text-amber-500 focus:ring-amber-500 h-4 w-4"
                    checked={itemForm.is_galvanized}
                    onChange={(e) => setItemForm({ ...itemForm, is_galvanized: e.target.checked })}
                  />
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-600">Galvanized Finish</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    className="rounded border-slate-350 text-amber-500 focus:ring-amber-500 h-4 w-4"
                    checked={itemForm.is_anodized}
                    onChange={(e) => setItemForm({ ...itemForm, is_anodized: e.target.checked })}
                  />
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-600">Anodized Finish</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    className="rounded border-slate-350 text-amber-500 focus:ring-amber-500 h-4 w-4"
                    checked={itemForm.is_powder_coated}
                    onChange={(e) => setItemForm({ ...itemForm, is_powder_coated: e.target.checked })}
                  />
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-600">Powder Coated Finish</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    className="rounded border-slate-350 text-amber-500 focus:ring-amber-500 h-4 w-4"
                    checked={itemForm.is_subcontract}
                    onChange={(e) => setItemForm({ ...itemForm, is_subcontract: e.target.checked })}
                  />
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-600">Subcontract/Outsourced</span>
                </label>
              </div>

              {itemForm.is_subcontract && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Subcontract Cost ($)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono"
                    value={itemForm.subcontract_amount}
                    onChange={(e) => setItemForm({ ...itemForm, subcontract_amount: Math.max(0, parseFloat(e.target.value) || 0) })}
                  />
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowItemForm(false)} 
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 font-bold rounded-lg text-xs uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all shadow-sm"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
