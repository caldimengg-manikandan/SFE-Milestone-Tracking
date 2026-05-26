import { useState } from 'react';
import { Layers, Scale, DollarSign, Calculator, ChevronDown, ChevronUp, Save, Download } from 'lucide-react';

export const defaultWorksheet = {
  // Section 1: Areas
  level1_area: '',
  level1_include: 'Y',
  level1_notes: '',
  level2_area: '',
  level2_include: 'Y',
  level2_notes: '',
  level3_area: '',
  level3_include: 'Y',
  level3_notes: '',
  level4_area: '',
  level4_include: 'Y',
  level4_notes: '',
  roof_area: '',
  roof_include: 'Y',
  roof_notes: '',
  total_floor_sf: '',
  total_roof_sf: '',

  // Section 2: Assumptions
  typ_floor_framing_lbs_sf: '',
  roof_framing_lbs_sf: '',
  misc_steel_lbs_sf: '',
  moment_frame_adder_pct: '',
  facade_support_premium_pct: '',
  rooftop_allowance_lb: '',
  canopy_allowance_lb: '',
  contingency_pct: '',

  // Section 3: Costing
  budget_ton_rate: '',

  // Section 4: Results
  floor_framing_steel_lb: '',
  floor_framing_steel_tons: '',
  floor_framing_steel_notes: '',
  roof_framing_steel_lb: '',
  roof_framing_steel_tons: '',
  roof_framing_steel_notes: '',
  misc_steel_lb: '',
  misc_steel_tons: '',
  misc_steel_notes: '',
  rooftop_allowance_result_lb: '',
  rooftop_allowance_result_tons: '',
  rooftop_allowance_result_notes: '',
  canopy_allowance_result_lb: '',
  canopy_allowance_result_tons: '',
  canopy_allowance_result_notes: '',
  gravity_subtotal_lb: '',
  gravity_subtotal_tons: '',
  gravity_subtotal_notes: '',
  moment_premium_lb: '',
  moment_premium_tons: '',
  moment_premium_notes: '',
  facade_premium_lb: '',
  facade_premium_tons: '',
  facade_premium_notes: '',
  subtotal_before_cont_lb: '',
  subtotal_before_cont_tons: '',
  contingency_result_lb: '',
  contingency_result_tons: '',
  contingency_result_notes: '',
  total_est_steel_lb: '',
  total_est_steel_tons: '',
  total_est_steel_notes: '',
  total_budget_usd: '',
  total_budget_usd_notes: ''
};


export const parseNum = (val) => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).replace(/[^0-9.-]/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

export const formatNum = (val, decimals = 0) => {
  if (val === undefined || val === null) return '';
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  return num.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

export const recalculateWorksheet = (ws) => {
  const level1_area = parseNum(ws.level1_area);
  const level1_inc = ws.level1_include === 'Y';
  const level2_area = parseNum(ws.level2_area);
  const level2_inc = ws.level2_include === 'Y';
  const level3_area = parseNum(ws.level3_area);
  const level3_inc = ws.level3_include === 'Y';
  const level4_area = parseNum(ws.level4_area);
  const level4_inc = ws.level4_include === 'Y';
  const roof_area = parseNum(ws.roof_area);
  const roof_inc = ws.roof_include === 'Y';

  // 1. Total Included Floor SF — always recalculate from levels
  let total_floor_sf = 0;
  if (level1_inc) total_floor_sf += level1_area;
  if (level2_inc) total_floor_sf += level2_area;
  if (level3_inc) total_floor_sf += level3_area;
  if (level4_inc) total_floor_sf += level4_area;

  // 2. Roof SF
  const total_roof_sf = roof_inc ? roof_area : 0;

  // Inputs
  const typ_floor_framing_lbs_sf = parseNum(ws.typ_floor_framing_lbs_sf);
  const roof_framing_lbs_sf = parseNum(ws.roof_framing_lbs_sf);
  const misc_steel_lbs_sf = parseNum(ws.misc_steel_lbs_sf);
  const moment_frame_adder_pct = parseNum(ws.moment_frame_adder_pct);
  const facade_support_premium_pct = parseNum(ws.facade_support_premium_pct);
  const rooftop_allowance_lb = parseNum(ws.rooftop_allowance_lb);
  const canopy_allowance_lb = parseNum(ws.canopy_allowance_lb);
  const contingency_pct = parseNum(ws.contingency_pct);
  const budget_ton_rate = parseNum(ws.budget_ton_rate);

  // Results
  // Floor framing steel = Floor SF * Typical floor framing (lbs/SF)
  const floor_framing_steel_lb = total_floor_sf * typ_floor_framing_lbs_sf;
  const floor_framing_steel_tons = floor_framing_steel_lb / 2000;

  // Roof framing steel = Roof SF * Roof framing (lbs/SF)
  const roof_framing_steel_lb = total_roof_sf * roof_framing_lbs_sf;
  const roof_framing_steel_tons = roof_framing_steel_lb / 2000;

  // Misc/secondary steel = (Floor SF + Roof SF) * Misc/Secondary lbs/SF
  const misc_steel_lb = (total_floor_sf + total_roof_sf) * misc_steel_lbs_sf;
  const misc_steel_tons = misc_steel_lb / 2000;

  // Rooftop dunnage/curb = Rooftop equipment allowance (lump sum)
  const rooftop_allowance_result_lb = rooftop_allowance_lb;
  const rooftop_allowance_result_tons = rooftop_allowance_result_lb / 2000;

  // Entrance/drive canopy = Canopy allowance (lump sum)
  const canopy_allowance_result_lb = canopy_allowance_lb;
  const canopy_allowance_result_tons = canopy_allowance_result_lb / 2000;

  // Gravity steel subtotal = Floor framing + Roof framing (lb and tons)
  const gravity_subtotal_lb = floor_framing_steel_lb + roof_framing_steel_lb;
  const gravity_subtotal_tons = gravity_subtotal_lb / 2000;

  // Moment premium = Gravity steel subtotal * Moment adder %
  const moment_premium_lb = gravity_subtotal_lb * (moment_frame_adder_pct / 100);
  const moment_premium_tons = moment_premium_lb / 2000;

  // Façade premium = Gravity steel subtotal * Façade premium %
  const facade_premium_lb = gravity_subtotal_lb * (facade_support_premium_pct / 100);
  const facade_premium_tons = facade_premium_lb / 2000;

  // Subtotal before contingency = Gravity subtotal + Moment premium + Façade premium
  const subtotal_before_cont_lb = gravity_subtotal_lb + moment_premium_lb + facade_premium_lb;
  const subtotal_before_cont_tons = subtotal_before_cont_lb / 2000;

  // Contingency = Subtotal before contingency * Contingency %
  const contingency_result_lb = subtotal_before_cont_lb * (contingency_pct / 100);
  const contingency_result_tons = contingency_result_lb / 2000;

  // Total Estimated Structural Steel = Subtotal before contingency + Contingency
  const total_est_steel_lb = subtotal_before_cont_lb + contingency_result_lb;
  const total_est_steel_tons = total_est_steel_lb / 2000;

  // Total Budget = if budget rate > 0: (Total steel tons) * Rate, else 0
  const total_budget_usd = budget_ton_rate > 0 ? (total_est_steel_tons * budget_ton_rate) : 0;

  return {
    ...ws,
    total_floor_sf: formatNum(total_floor_sf),
    total_roof_sf: formatNum(total_roof_sf),

    floor_framing_steel_lb: formatNum(floor_framing_steel_lb),
    floor_framing_steel_tons: formatNum(floor_framing_steel_tons, 1),

    roof_framing_steel_lb: formatNum(roof_framing_steel_lb),
    roof_framing_steel_tons: formatNum(roof_framing_steel_tons, 1),

    misc_steel_lb: formatNum(misc_steel_lb),
    misc_steel_tons: formatNum(misc_steel_tons, 1),

    rooftop_allowance_result_lb: formatNum(rooftop_allowance_result_lb),
    rooftop_allowance_result_tons: formatNum(rooftop_allowance_result_tons, 1),

    canopy_allowance_result_lb: formatNum(canopy_allowance_result_lb),
    canopy_allowance_result_tons: formatNum(canopy_allowance_result_tons, 1),

    gravity_subtotal_lb: formatNum(gravity_subtotal_lb),
    gravity_subtotal_tons: formatNum(gravity_subtotal_tons, 1),

    moment_premium_lb: formatNum(moment_premium_lb),
    moment_premium_tons: formatNum(moment_premium_tons, 1),

    facade_premium_lb: formatNum(facade_premium_lb),
    facade_premium_tons: formatNum(facade_premium_tons, 1),

    subtotal_before_cont_lb: formatNum(subtotal_before_cont_lb),
    subtotal_before_cont_tons: formatNum(subtotal_before_cont_tons, 1),

    contingency_result_lb: formatNum(contingency_result_lb),
    contingency_result_tons: formatNum(contingency_result_tons, 1),

    total_est_steel_lb: formatNum(total_est_steel_lb),
    total_est_steel_tons: formatNum(total_est_steel_tons, 1),

    total_budget_usd: formatNum(total_budget_usd)
  };
};

export default function SteelBudgetForm({
  form,
  setForm,
  mode = 'edit',
  displayPart = 'both'
}) {
  const worksheet = { ...defaultWorksheet, ...(form.steel_budget_worksheet || {}) };

  const [wsExpanded, setWsExpanded] = useState({
    areas: true,
    assumptions: true,
    costing: true,
    results: true
  });

  const handleWorksheetChange = (field, value) => {
    const updatedWorksheet = {
      ...worksheet,
      [field]: value
    };
    const recalculated = recalculateWorksheet(updatedWorksheet);
    setForm({
      ...form,
      steel_budget_worksheet: recalculated,
      total_ton: parseNum(recalculated.total_est_steel_tons) || form.total_ton
    });
  };

  const renderAreaRow = (levelLabel, areaField, includeField, notesField) => {
    return (
      <tr key={levelLabel} className="hover:bg-slate-50/50 transition-colors">
        <td className="px-4 py-3 font-semibold text-slate-700 text-sm border-r border-slate-100">{levelLabel}</td>
        <td className="px-4 py-2 border-r border-slate-100">
          <input
            value={worksheet[areaField] || ''}
            disabled={mode === 'view'}
            onChange={e => handleWorksheetChange(areaField, e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/5 transition-all text-right font-medium"
            placeholder="0"
          />
        </td>
        <td className="px-4 py-2 border-r border-slate-100">
          <select
            value={worksheet[includeField] || 'Y'}
            disabled={mode === 'view'}
            onChange={e => handleWorksheetChange(includeField, e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/5 transition-all font-semibold text-slate-700"
          >
            <option value="Y">Y</option>
            <option value="N">N</option>
          </select>
        </td>
        <td className="px-4 py-2">
          <input
            value={worksheet[notesField] || ''}
            disabled={mode === 'view'}
            onChange={e => handleWorksheetChange(notesField, e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/5 transition-all text-slate-600"
            placeholder="Notes..."
          />
        </td>
      </tr>
    );
  };

  const renderResultRow = (lineItem, lbField, tonsField, notesField) => {
    return (
      <tr key={lineItem} className="hover:bg-slate-50/50 transition-all border-b border-slate-100">
        <td className="px-4 py-3 font-semibold text-slate-800 text-sm border-r border-slate-100 bg-slate-50/30">{lineItem}</td>
        <td className="px-4 py-2 border-r border-slate-100">
          <input
            value={worksheet[lbField] || ''}
            disabled={mode === 'view'}
            onChange={e => handleWorksheetChange(lbField, e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-amber-50/10 text-sm outline-none focus:border-amber-400 transition-all text-right font-medium text-amber-900"
          />
        </td>
        <td className="px-4 py-2 border-r border-slate-100">
          <input
            value={worksheet[tonsField] || ''}
            disabled={mode === 'view'}
            onChange={e => handleWorksheetChange(tonsField, e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-amber-50/10 text-sm outline-none focus:border-amber-400 transition-all text-right font-bold text-amber-900"
          />
        </td>
        <td className="px-4 py-2">
          {notesField ? (
            <input
              value={worksheet[notesField] || ''}
              disabled={mode === 'view'}
              onChange={e => handleWorksheetChange(notesField, e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 transition-all text-slate-600"
            />
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </td>
      </tr>
    );
  };

  const isInput = displayPart === 'input' || displayPart === 'both';
  const isResult = displayPart === 'result' || displayPart === 'both';
  const showGrid = displayPart === 'both';

  return (
    <div className={showGrid ? "grid grid-cols-1 xl:grid-cols-2 gap-8 items-start" : "space-y-6 max-w-5xl mx-auto"}>
      {/* ─── LEFT COLUMN: WORKSHEET INPUTS ─── */}
      {isInput && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/10">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">Worksheet Inputs</h3>
              <p className="text-xs text-slate-500">Configure areas, framing factors, and allowances</p>
            </div>
          </div>

          {/* ACCORDION 1: PROJECT AREAS */}
          <div className="border border-slate-200/80 rounded-2xl bg-white overflow-hidden shadow-sm transition-all duration-200">
            <button
              type="button"
              onClick={() => setWsExpanded({ ...wsExpanded, areas: !wsExpanded.areas })}
              className="w-full flex items-center justify-between px-6 py-4 bg-slate-50/50 hover:bg-slate-50 transition-all border-b border-slate-100 font-semibold"
            >
              <span className="font-bold text-slate-800 text-sm">Project Areas (Editable)</span>
              {wsExpanded.areas ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {wsExpanded.areas && (
              <div className="p-6 space-y-4">
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider">
                        <th className="px-4 py-3 border-r border-slate-100">Level</th>
                        <th className="px-4 py-3 border-r border-slate-100 text-right">Area (SF)</th>
                        <th className="px-4 py-3 border-r border-slate-100">Include in Steel?</th>
                        <th className="px-4 py-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {renderAreaRow("Level 1", "level1_area", "level1_include", "level1_notes")}
                      {renderAreaRow("Level 2", "level2_area", "level2_include", "level2_notes")}
                      {renderAreaRow("Level 3", "level3_area", "level3_include", "level3_notes")}
                      {renderAreaRow("Level 4", "level4_area", "level4_include", "level4_notes")}
                      {renderAreaRow("Roof", "roof_area", "roof_include", "roof_notes")}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 p-4 rounded-xl bg-slate-50/80 border border-slate-100/80">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Total Included Floor SF</label>
                    <p className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-800 text-right">
                      {worksheet.total_floor_sf || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Roof SF</label>
                    <input
                      value={worksheet.total_roof_sf}
                      disabled={mode === 'view'}
                      onChange={e => handleWorksheetChange('total_roof_sf', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-800 outline-none focus:border-amber-400 transition-all text-right"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 2: STEEL WEIGHT ASSUMPTIONS */}
          <div className="border border-slate-200/80 rounded-2xl bg-white overflow-hidden shadow-sm transition-all duration-200">
            <button
              type="button"
              onClick={() => setWsExpanded({ ...wsExpanded, assumptions: !wsExpanded.assumptions })}
              className="w-full flex items-center justify-between px-6 py-4 bg-slate-50/50 hover:bg-slate-50 transition-all border-b border-slate-100 font-semibold"
            >
              <span className="font-bold text-slate-800 text-sm">Steel Weight Assumptions (Editable)</span>
              {wsExpanded.assumptions ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {wsExpanded.assumptions && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Typical Floor Framing (beams+girders) lbs/SF</label>
                  <input
                    value={worksheet.typ_floor_framing_lbs_sf}
                    disabled={mode === 'view'}
                    onChange={e => handleWorksheetChange('typ_floor_framing_lbs_sf', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 transition-all font-medium text-slate-800"
                    placeholder="e.g., 15.0"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Roof Framing (beams+girders) lbs/SF</label>
                  <input
                    value={worksheet.roof_framing_lbs_sf}
                    disabled={mode === 'view'}
                    onChange={e => handleWorksheetChange('roof_framing_lbs_sf', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 transition-all font-medium text-slate-800"
                    placeholder="e.g., 12.0"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Misc/Secondary Steel lbs/SF (stairs/elev/façade support baseline)</label>
                  <input
                    value={worksheet.misc_steel_lbs_sf}
                    disabled={mode === 'view'}
                    onChange={e => handleWorksheetChange('misc_steel_lbs_sf', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 transition-all font-medium text-slate-800"
                    placeholder="e.g., 2.5"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Moment Frame / Lateral System Adder (%)</label>
                  <input
                    value={worksheet.moment_frame_adder_pct}
                    disabled={mode === 'view'}
                    onChange={e => handleWorksheetChange('moment_frame_adder_pct', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 transition-all font-medium text-slate-800"
                    placeholder="e.g., 1.0"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Façade/Precast Support Premium (%) (only where hung from frame)</label>
                  <input
                    value={worksheet.facade_support_premium_pct}
                    disabled={mode === 'view'}
                    onChange={e => handleWorksheetChange('facade_support_premium_pct', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 transition-all font-medium text-slate-800"
                    placeholder="e.g., 3.0"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Rooftop Equipment/Dunnage Allowance (lump sum lb)</label>
                  <input
                    value={worksheet.rooftop_allowance_lb}
                    disabled={mode === 'view'}
                    onChange={e => handleWorksheetChange('rooftop_allowance_lb', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 transition-all font-medium text-slate-800"
                    placeholder="e.g., 15,000"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Entrance/Drive Canopy Allowance (lump sum lb)</label>
                  <input
                    value={worksheet.canopy_allowance_lb}
                    disabled={mode === 'view'}
                    onChange={e => handleWorksheetChange('canopy_allowance_lb', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 transition-all font-medium text-slate-800"
                    placeholder="e.g., 25,000"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Contingency (%)</label>
                  <input
                    value={worksheet.contingency_pct}
                    disabled={mode === 'view'}
                    onChange={e => handleWorksheetChange('contingency_pct', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 transition-all font-medium text-slate-800"
                    placeholder="e.g., 5.0"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ACCORDION 3: COSTING */}
          <div className="border border-slate-200/80 rounded-2xl bg-white overflow-hidden shadow-sm transition-all duration-200">
            <button
              type="button"
              onClick={() => setWsExpanded({ ...wsExpanded, costing: !wsExpanded.costing })}
              className="w-full flex items-center justify-between px-6 py-4 bg-slate-50/50 hover:bg-slate-50 transition-all border-b border-slate-100 font-semibold"
            >
              <span className="font-bold text-slate-800 text-sm">Costing (Optional)</span>
              {wsExpanded.costing ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {wsExpanded.costing && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1">Budget $/Ton (enter 0 to ignore)</label>
                  <input
                    value={worksheet.budget_ton_rate}
                    disabled={mode === 'view'}
                    onChange={e => handleWorksheetChange('budget_ton_rate', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 transition-all font-bold text-amber-700"
                    placeholder="e.g., $5,500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── RIGHT COLUMN: ESTIMATION RESULTS ─── */}
      {isResult && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/10">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">Estimation Results</h3>
              <p className="text-xs text-slate-500">Auto-calculated weights (lb/tons) and total budget estimation</p>
            </div>
          </div>

          {/* ACCORDION 4: RESULTS */}
          <div className="border border-slate-200/80 rounded-2xl bg-white overflow-hidden shadow-sm transition-all duration-200">
            <button
              type="button"
              onClick={() => setWsExpanded({ ...wsExpanded, results: !wsExpanded.results })}
              className="w-full flex items-center justify-between px-6 py-4 bg-slate-50/50 hover:bg-slate-50 transition-all border-b border-slate-100 font-semibold"
            >
              <span className="font-bold text-slate-800 text-sm">Steel Weight Breakdown & Results</span>
              {wsExpanded.results ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {wsExpanded.results && (
              <div className="p-6 space-y-4">
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider">
                        <th className="px-4 py-3 border-r border-slate-100">Line Item</th>
                        <th className="px-4 py-3 border-r border-slate-100 text-right">Calc Weight (lb)</th>
                        <th className="px-4 py-3 border-r border-slate-100 text-right">Calc Weight (tons)</th>
                        <th className="px-4 py-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {renderResultRow("Floor framing steel", "floor_framing_steel_lb", "floor_framing_steel_tons", "floor_framing_steel_notes")}
                      {renderResultRow("Roof framing steel", "roof_framing_steel_lb", "roof_framing_steel_tons", "roof_framing_steel_notes")}
                      {renderResultRow("Misc/secondary steel", "misc_steel_lb", "misc_steel_tons", "misc_steel_notes")}
                      {renderResultRow("Rooftop dunnage/curb allowance", "rooftop_allowance_result_lb", "rooftop_allowance_result_tons", "rooftop_allowance_result_notes")}
                      {renderResultRow("Entrance/drive canopy allowance", "canopy_allowance_result_lb", "canopy_allowance_result_tons", "canopy_allowance_result_notes")}

                      {/* Gravity steel subtotal */}
                      <tr className="bg-slate-50 font-bold border-b border-slate-100">
                        <td className="px-4 py-3 text-slate-800 text-sm border-r border-slate-100 bg-slate-50/30">Gravity steel subtotal (floors+roof)</td>
                        <td className="px-4 py-2 border-r border-slate-100 text-right">
                          <input
                            value={worksheet.gravity_subtotal_lb || ''}
                            disabled={mode === 'view'}
                            onChange={e => handleWorksheetChange('gravity_subtotal_lb', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-sm outline-none focus:border-amber-400 text-right font-bold text-slate-700"
                          />
                        </td>
                        <td className="px-4 py-2 border-r border-slate-100 text-right">
                          <input
                            value={worksheet.gravity_subtotal_tons || ''}
                            disabled={mode === 'view'}
                            onChange={e => handleWorksheetChange('gravity_subtotal_tons', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-sm outline-none focus:border-amber-400 text-right font-bold text-slate-700"
                          />
                        </td>
                        <td className="px-4 py-2 text-slate-500 font-normal">
                          <input
                            value={worksheet.gravity_subtotal_notes || ''}
                            disabled={mode === 'view'}
                            onChange={e => handleWorksheetChange('gravity_subtotal_notes', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 text-slate-600 font-normal"
                          />
                        </td>
                      </tr>

                      {renderResultRow("Moment frame / lateral premium", "moment_premium_lb", "moment_premium_tons", "moment_premium_notes")}
                      {renderResultRow("Façade/precast support premium", "facade_premium_lb", "facade_premium_tons", "facade_premium_notes")}

                      {/* Subtotal before contingency */}
                      <tr className="bg-slate-50 font-bold border-b border-slate-100">
                        <td className="px-4 py-3 text-slate-800 text-sm border-r border-slate-100 bg-slate-50/30">Subtotal before contingency</td>
                        <td className="px-4 py-2 border-r border-slate-100 text-right">
                          <input
                            value={worksheet.subtotal_before_cont_lb || ''}
                            disabled={mode === 'view'}
                            onChange={e => handleWorksheetChange('subtotal_before_cont_lb', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-sm outline-none focus:border-amber-400 text-right font-bold text-slate-700"
                          />
                        </td>
                        <td className="px-4 py-2 border-r border-slate-100 text-right">
                          <input
                            value={worksheet.subtotal_before_cont_tons || ''}
                            disabled={mode === 'view'}
                            onChange={e => handleWorksheetChange('subtotal_before_cont_tons', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-sm outline-none focus:border-amber-400 text-right font-bold text-slate-700"
                          />
                        </td>
                        <td className="px-4 py-2 text-slate-400 font-normal">-</td>
                      </tr>

                      {renderResultRow("Contingency", "contingency_result_lb", "contingency_result_tons", "contingency_result_notes")}

                      {/* TOTAL ESTIMATED STRUCTURAL STEEL */}
                      <tr className="bg-emerald-500/10 font-bold border-t border-b border-emerald-500/20">
                        <td className="px-4 py-3 text-emerald-900 text-sm border-r border-emerald-100 bg-slate-50/30">TOTAL ESTIMATED STRUCTURAL STEEL</td>
                        <td className="px-4 py-2 border-r border-emerald-100 text-right">
                          <input
                            value={worksheet.total_est_steel_lb || ''}
                            disabled={mode === 'view'}
                            onChange={e => handleWorksheetChange('total_est_steel_lb', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-sm outline-none focus:border-emerald-400 text-right font-black text-emerald-950"
                          />
                        </td>
                        <td className="px-4 py-2 border-r border-emerald-100 text-right">
                          <input
                            value={worksheet.total_est_steel_tons || ''}
                            disabled={mode === 'view'}
                            onChange={e => handleWorksheetChange('total_est_steel_tons', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-sm outline-none focus:border-emerald-400 text-right font-black text-emerald-950"
                          />
                        </td>
                        <td className="px-4 py-2 text-emerald-900">
                          <input
                            value={worksheet.total_est_steel_notes || ''}
                            disabled={mode === 'view'}
                            onChange={e => handleWorksheetChange('total_est_steel_notes', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-emerald-200 bg-white text-sm outline-none focus:border-emerald-400 text-slate-600 font-normal"
                          />
                        </td>
                      </tr>

                      {/* TOTAL BUDGET ($) */}
                      <tr className="bg-amber-500/10 font-bold border-t-2 border-amber-500/30">
                        <td className="px-4 py-3 text-amber-900 text-sm border-r border-amber-100 bg-slate-50/30">TOTAL BUDGET ($)</td>
                        <td colSpan={2} className="px-4 py-2 border-r border-amber-100 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-amber-950 font-bold">$</span>
                            <input
                              value={worksheet.total_budget_usd || ''}
                              disabled={mode === 'view'}
                              onChange={e => handleWorksheetChange('total_budget_usd', e.target.value)}
                              className="w-full max-w-[200px] px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-100 text-sm outline-none focus:border-amber-500 text-center font-black text-amber-950"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2 text-amber-950">
                          <input
                            value={worksheet.total_budget_usd_notes || ''}
                            disabled={mode === 'view'}
                            onChange={e => handleWorksheetChange('total_budget_usd_notes', e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-amber-200 bg-white text-sm outline-none focus:border-amber-400 text-slate-600 font-normal"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}