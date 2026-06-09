import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../services/api";
import { useAutoSave } from "../../hooks/useAutoSave";
import AutoSaveIndicator from "../../components/AutoSaveIndicator";
import { Plus, Trash, Search } from "lucide-react";

export default function FieldMomentConnTab() {
  const { projectId, project } = useOutletContext();
  const isReadOnly = project?.is_finalized || false;

  const [takeoff, setTakeoff] = useState(null);
  const [loading, setLoading] = useState(true);
  const { saveState, lastSaved, triggerSave } = useAutoSave();

  // Search autocomplete state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [quantity, setQuantity] = useState("1");
  const [searchFocused, setSearchFocused] = useState(false);

  // Custom section modal state
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customBf, setCustomBf] = useState("");
  const [customTf, setCustomTf] = useState("");
  const [customSubmitting, setCustomSubmitting] = useState(false);

  const fetchTakeoff = async () => {
    try {
      const res = await api.get(`projects/${projectId}/fmc/`);
      setTakeoff(res.data);
    } catch (err) {
      console.error("Failed to load FMC takeoff details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTakeoff();
  }, [projectId]);

  // Handle typing search query
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const response = await api.get(`reference/aisc-sections/?search=${searchQuery}`);
        setSearchResults(response.data.results || response.data);
      } catch (err) {
        console.error("Failed to search AISC catalog:", err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddLine = async (e) => {
    e.preventDefault();
    if (!selectedSection || !quantity) return;
    try {
      await api.post(`projects/${projectId}/fmc/lines/`, {
        aisc_section: selectedSection.id,
        quantity: parseInt(quantity),
      });
      setSelectedSection(null);
      setSearchQuery("");
      setQuantity("1");
      fetchTakeoff();
    } catch (err) {
      alert("Failed to add AISC section line.");
    }
  };

  const handleUpdateLineQty = (lineId, val) => {
    // Optimistic update of local UI state
    const valNum = parseInt(val) || 0;
    const updatedLines = takeoff.lines.map((line) => {
      if (line.id === lineId) {
        // Recalculate locally for immediate visual feedback
        const row = line.computed || {};
        return {
          ...line,
          quantity: val,
          computed: {
            ...row,
            quantity: valNum,
            field_hours_total: valNum * (row.field_hrs_both || 0),
          },
        };
      }
      return line;
    });

    setTakeoff({
      ...takeoff,
      lines: updatedLines,
      computed: {
        ...takeoff.computed,
        grand_total_field_hours: updatedLines.reduce((acc, curr) => acc + (curr.computed?.field_hours_total || 0), 0),
      },
    });

    if (!isReadOnly) {
      triggerSave(async () => {
        await api.patch(`projects/${projectId}/fmc/lines/${lineId}/`, {
          quantity: valNum,
        });
        fetchTakeoff();
      });
    }
  };

  const handleDeleteLine = async (lineId) => {
    try {
      await api.delete(`projects/${projectId}/fmc/lines/${lineId}/`);
      fetchTakeoff();
    } catch (err) {
      alert("Failed to delete line.");
    }
  };

  const handleCreateCustomSection = async (e) => {
    e.preventDefault();
    if (!customLabel || !customBf || !customTf) return;
    
    setCustomSubmitting(true);
    try {
      const res = await api.post("reference/aisc-sections/", {
        label: customLabel.toUpperCase(),
        bf: parseFloat(customBf),
        tf: parseFloat(customTf),
      });
      
      // Auto-select the newly created section
      setSelectedSection(res.data);
      setSearchQuery(`${res.data.label} (bf=${res.data.bf}, tf=${res.data.tf})`);
      setShowAddCustomModal(false);
      
      // Clear form
      setCustomLabel("");
      setCustomBf("");
      setCustomTf("");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.label?.[0] || "Failed to create custom section. It might already exist.");
    } finally {
      setCustomSubmitting(false);
    }
  };

  if (loading) return <div className="text-center font-mono py-8 text-slate-500">Loading Field Moment Connections...</div>;
  if (!takeoff) return <div className="text-center font-mono py-8 text-slate-500">Takeoff details missing.</div>;

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full text-slate-800">
      {/* Tab Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 tracking-wider uppercase">Field Moment Connections</h2>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">Flange width × thickness hour calculation (AISC catalog)</p>
        </div>
        <AutoSaveIndicator state={saveState} lastSaved={lastSaved} />
      </div>

      {/* AISC Search Adder Panel */}
      {!isReadOnly && (
        <form onSubmit={handleAddLine} className="bg-white border border-slate-200 p-5 rounded-xl space-y-4 shadow-sm">
          <h3 className="text-xs font-bold uppercase text-amber-600 tracking-wider border-b border-slate-100 pb-2">Add AISC W-Shape Section</h3>
          
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 relative w-full">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">AISC Catalog Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="e.g. W14X82, W36..."
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg pl-10 pr-3 py-2 text-sm outline-none transition-all font-mono"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedSection(null);
                  }}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                />
              </div>

              {/* Autocomplete dropdown */}
              {searchFocused && searchQuery && (
                <div className="absolute left-0 right-0 top-[70px] bg-white border border-slate-200 max-h-60 overflow-y-auto rounded-lg shadow-2xl z-50 divide-y divide-slate-100">
                  {searchResults.map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                      onClick={() => {
                        setSelectedSection(sec);
                        setSearchQuery(`${sec.label} (bf=${sec.bf}, tf=${sec.tf})`);
                        setSearchFocused(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-amber-50/50 hover:text-amber-600 border-b border-slate-100 font-mono text-slate-700"
                    >
                      {sec.label} — <span className="text-slate-400 text-xs">bf={sec.bf}", tf={sec.tf}"</span>
                    </button>
                  ))}
                  
                  {/* Create custom option */}
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setCustomLabel(searchQuery);
                      setShowAddCustomModal(true);
                      setSearchFocused(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50/30 hover:text-amber-700 font-semibold font-sans flex items-center gap-2 italic border-b border-slate-100"
                  >
                    <Plus size={14} />
                    Create Custom Shape: "{searchQuery}"
                  </button>
                </div>
              )}
            </div>

            <div className="w-full sm:w-32">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none transition-all font-mono text-right"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={!selectedSection || isReadOnly}
              className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Plus size={16} />
              Add Shape
            </button>
          </div>
        </form>
      )}

      {/* Connection Takeoff Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full border-collapse text-left text-xs sm:text-sm text-slate-700">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-200 text-[10px] sm:text-xs font-bold uppercase text-slate-500">
              <th className="px-4 py-3 w-28">AISC Section</th>
              <th className="px-4 py-3 text-right">bf (in)</th>
              <th className="px-4 py-3 text-right">tf (in)</th>
              <th className="px-4 py-3 text-right">bf × tf</th>
              <th className="px-4 py-3 text-right">Shop Hrs/flge.</th>
              <th className="px-4 py-3 text-right">Field Hrs/flge.</th>
              <th className="px-4 py-3 text-right">Field Hrs/both (1 end)</th>
              <th className="px-4 py-3 w-32 text-center">Quantity</th>
              <th className="px-4 py-3 w-32 text-right">Field Hours</th>
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {takeoff.lines.length === 0 ? (
              <tr>
                <td colSpan="10" className="px-4 py-8 text-center font-mono text-slate-400">
                  No connections added to this project takeoff.
                </td>
              </tr>
            ) : (
              takeoff.lines.map((line) => {
                const row = line.computed || {};
                return (
                  <tr key={line.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono text-slate-800 font-bold">{line.aisc_section_detail.label}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">{line.aisc_section_detail.bf}"</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">{line.aisc_section_detail.tf}"</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">{row.bf_x_tf}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">{row.shop_hrs_flange}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">{row.field_hrs_flange}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">{row.field_hrs_both}</td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="number"
                        disabled={isReadOnly}
                        className="w-20 bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded px-2 py-0.5 text-xs outline-none transition-all text-right font-mono mx-auto"
                        value={line.quantity}
                        onChange={(e) => handleUpdateLineQty(line.id, e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600 font-bold">
                      {row.field_hours_total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteLine(line.id)}
                        disabled={isReadOnly}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded transition-all"
                        title="Delete line"
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

      {/* FMC Total Panel */}
      <div className="flex justify-end pt-2">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm min-w-[300px] border-t-4 border-t-amber-500">
          <div className="flex justify-between items-center gap-4">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Grand Total Field Hours:</span>
            <span className="text-xl font-mono text-amber-600 font-black">
              {takeoff.computed?.grand_total_field_hours?.toLocaleString()} hrs
            </span>
          </div>
        </div>
      </div>

      {/* Add Custom Section Modal */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Add Custom AISC Shape</h3>
              <button 
                onClick={() => setShowAddCustomModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors text-lg"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateCustomSection} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Shape Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. W14X82"
                  className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none font-mono uppercase"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Flange Width (bf)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      required
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg pl-3 pr-8 py-2 text-sm outline-none font-mono text-right"
                      value={customBf}
                      onChange={(e) => setCustomBf(e.target.value)}
                    />
                    <span className="absolute right-3 top-2 text-slate-400 text-sm">in</span>
                  </div>
                </div>
                
                <div className="flex-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Flange Thick. (tf)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      required
                      className="w-full bg-white border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-slate-800 rounded-lg pl-3 pr-8 py-2 text-sm outline-none font-mono text-right"
                      value={customTf}
                      onChange={(e) => setCustomTf(e.target.value)}
                    />
                    <span className="absolute right-3 top-2 text-slate-400 text-sm">in</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-4 py-2 text-sm font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={customSubmitting}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-sm"
                >
                  {customSubmitting ? "Saving..." : "Save to Database"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
