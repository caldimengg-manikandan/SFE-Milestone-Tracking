import { useState, useEffect } from 'react';
import { 
  Calculator, 
  Trash2, 
  FileText 
} from 'lucide-react';

export default function EstimationModel() {
  // --- State for Project Info ---
  const [projectInfo, setProjectInfo] = useState(() => {
    const saved = localStorage.getItem('sfe_est_project');
    return saved ? JSON.parse(saved) : {
      project: '',
      location: '',
      materialDate: '',
      budgetPricing: 'N',
      date: new Date().toISOString().split('T')[0],
      salesman: '',
      quoteNum: '',
      startDate: ''
    };
  });

  // --- State for Bid Enquiry Sheet ---
  const [bidEnquiry, setBidEnquiry] = useState(() => {
    const saved = localStorage.getItem('sfe_est_bid_enquiry');
    return saved ? JSON.parse(saved) : {
      millWeight: '',
      millAmount: '',
      warehouseWeight: '',
      warehouseAmount: '',
      scrapPercent: 5.0,
      boltQty: '',
      boltRate: 1.75,
      paintQty: '',
      paintRate: 22.20,
      galvanizingWeight: '',
      galvanizingRate: 0.40,
      miscItems: [
        { id: 1, name: 'Weld Wire', amount: '' },
        { id: 2, name: 'anchor bolts', amount: '' },
        { id: 3, name: '', amount: '' },
        { id: 4, name: '', amount: '' },
        { id: 5, name: '', amount: '' },
        { id: 6, name: '', amount: '' },
        { id: 7, name: '', amount: '' },
      ],
      taxPercent: 6.0
    };
  });

  // Auto-save to Local Storage
  useEffect(() => {
    localStorage.setItem('sfe_est_project', JSON.stringify(projectInfo));
  }, [projectInfo]);

  useEffect(() => {
    localStorage.setItem('sfe_est_bid_enquiry', JSON.stringify(bidEnquiry));
  }, [bidEnquiry]);

  // --- Calculations ---

  // 1. Mill
  const millWeightVal = Number(bidEnquiry.millWeight) || 0;
  const millAmountVal = Number(bidEnquiry.millAmount) || 0;
  const millTons = millWeightVal / 2000;
  const millRatePerLb = millWeightVal < 1 ? 0 : millAmountVal / millWeightVal;

  // 2. Whse
  const warehouseWeightVal = Number(bidEnquiry.warehouseWeight) || 0;
  const warehouseAmountVal = Number(bidEnquiry.warehouseAmount) || 0;
  const warehouseTons = warehouseWeightVal / 2000;
  const warehouseRatePerLb = warehouseWeightVal < 1 ? 0 : warehouseAmountVal / warehouseWeightVal;

  // 3. Scrap
  const scrapPercentVal = Number(bidEnquiry.scrapPercent) || 0;
  const scrapTons = millTons + warehouseTons;
  const scrapAmount = (millAmountVal + warehouseAmountVal) * (scrapPercentVal / 100);

  // 4. Shop & Field Bolts
  const boltQtyVal = Number(bidEnquiry.boltQty) || 0;
  const boltRateVal = Number(bidEnquiry.boltRate) || 0;
  const boltAmount = boltQtyVal * boltRateVal;

  // 5. Paint
  const paintQtyVal = Number(bidEnquiry.paintQty) || 0;
  const paintRateVal = Number(bidEnquiry.paintRate) || 0;
  const paintAmount = paintQtyVal * paintRateVal;

  // 6. Galvanizing
  const galvanizingWeightVal = Number(bidEnquiry.galvanizingWeight) || 0;
  const galvanizingRateVal = Number(bidEnquiry.galvanizingRate) || 0;
  const adjustedGalvanizedWeight = galvanizingWeightVal * 1.05;
  const galvanizingAmount = adjustedGalvanizedWeight * galvanizingRateVal;

  // 7. Miscellaneous Items Subtotal
  const miscSubtotal = bidEnquiry.miscItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  // 8. Total Direct Costs
  const totalDirectCosts = 
    millAmountVal + 
    warehouseAmountVal + 
    scrapAmount + 
    boltAmount + 
    paintAmount + 
    galvanizingAmount + 
    miscSubtotal;

  // 9. Use Tax
  const taxPercentVal = Number(bidEnquiry.taxPercent) || 0;
  const useTaxAmount = totalDirectCosts * (taxPercentVal / 100);

  // Total Bid Material Cost
  const totalBidMaterialCost = totalDirectCosts + useTaxAmount;

  // Clear Form handler
  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear all fields?")) {
      setProjectInfo({
        project: '',
        location: '',
        materialDate: '',
        budgetPricing: 'N',
        date: new Date().toISOString().split('T')[0],
        salesman: '',
        quoteNum: '',
        startDate: ''
      });
      setBidEnquiry({
        millWeight: '',
        millAmount: '',
        warehouseWeight: '',
        warehouseAmount: '',
        scrapPercent: 5.0,
        boltQty: '',
        boltRate: 1.75,
        paintQty: '',
        paintRate: 22.20,
        galvanizingWeight: '',
        galvanizingRate: 0.40,
        miscItems: [
          { id: 1, name: 'Weld Wire', amount: '' },
          { id: 2, name: 'anchor bolts', amount: '' },
          { id: 3, name: '', amount: '' },
          { id: 4, name: '', amount: '' },
          { id: 5, name: '', amount: '' },
          { id: 6, name: '', amount: '' },
          { id: 7, name: '', amount: '' },
        ],
        taxPercent: 6.0
      });
    }
  };

  // Helper to handle text updates inside Misc array
  const handleMiscTextChange = (id, text) => {
    setBidEnquiry(prev => ({
      ...prev,
      miscItems: prev.miscItems.map(item => item.id === id ? { ...item, name: text } : item)
    }));
  };

  // Helper to handle amount updates inside Misc array
  const handleMiscAmountChange = (id, amount) => {
    setBidEnquiry(prev => ({
      ...prev,
      miscItems: prev.miscItems.map(item => item.id === id ? { ...item, amount: amount } : item)
    }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-2 animate-fade-in">
      
      {/* ── Header Area ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Calculator className="w-8 h-8 text-amber-500 stroke-[2.5]" />
            Bid Enquiry Calculation
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Perform detailed bid estimations using Excel-aligned calculation logic.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-xs transition-all border border-slate-200"
            title="Clear all fields"
          >
            <Trash2 className="w-4 h-4" />
            Clear Form
          </button>
        </div>
      </div>

      {/* ── Card 1: Project Specifications ── */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <FileText className="w-6 h-6 text-amber-500" />
          <h3 className="text-lg font-bold text-slate-900">Project Specifications</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          
          {/* Left Column Inputs */}
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PROJECT</label>
              <input
                type="text"
                value={projectInfo.project}
                placeholder="Enter project name..."
                onChange={(e) => setProjectInfo({ ...projectInfo, project: e.target.value })}
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-750 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">LOCATION</label>
              <input
                type="text"
                value={projectInfo.location}
                placeholder="Enter site location..."
                onChange={(e) => setProjectInfo({ ...projectInfo, location: e.target.value })}
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-755 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">MATERIAL DATE</label>
              <input
                type="date"
                value={projectInfo.materialDate}
                onChange={(e) => setProjectInfo({ ...projectInfo, materialDate: e.target.value })}
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-755 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">BUDGET PRICING (Y/N)</label>
              <div className="flex gap-6 mt-1 ml-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700 select-none">
                  <input
                    type="radio"
                    name="budgetPricing"
                    value="Y"
                    checked={projectInfo.budgetPricing === 'Y'}
                    onChange={(e) => setProjectInfo({ ...projectInfo, budgetPricing: e.target.value })}
                    className="w-4 h-4 text-amber-500 border-slate-300 focus:ring-amber-500 cursor-pointer"
                  />
                  Yes
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700 select-none">
                  <input
                    type="radio"
                    name="budgetPricing"
                    value="N"
                    checked={projectInfo.budgetPricing === 'N'}
                    onChange={(e) => setProjectInfo({ ...projectInfo, budgetPricing: e.target.value })}
                    className="w-4 h-4 text-amber-500 border-slate-300 focus:ring-amber-500 cursor-pointer"
                  />
                  No
                </label>
              </div>
            </div>
          </div>

          {/* Right Column Inputs */}
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DATE</label>
              <input
                type="date"
                value={projectInfo.date}
                onChange={(e) => setProjectInfo({ ...projectInfo, date: e.target.value })}
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-755 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SALESMAN</label>
              <input
                type="text"
                value={projectInfo.salesman}
                placeholder="Enter sales representative..."
                onChange={(e) => setProjectInfo({ ...projectInfo, salesman: e.target.value })}
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-755 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">QUOTE #</label>
              <input
                type="text"
                value={projectInfo.quoteNum}
                placeholder="e.g. SFE-2026-904"
                onChange={(e) => setProjectInfo({ ...projectInfo, quoteNum: e.target.value })}
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-755 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">START DATE</label>
              <input
                type="date"
                value={projectInfo.startDate}
                onChange={(e) => setProjectInfo({ ...projectInfo, startDate: e.target.value })}
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-755 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none"
              />
            </div>
          </div>

        </div>
      </div>

      {/* ── Card 2: Bid Enquiry Calculator (Excel-Style Table) ── */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <Calculator className="w-6 h-6 text-amber-500" />
          <h3 className="text-lg font-bold text-slate-900">Bid Enquiry Calculation</h3>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-slate-500 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
          <span>Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 bg-[#fef9c3] border border-amber-300 rounded-sm" />
            <span>Yellow Fields = Editable Input Fields</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 bg-white border border-slate-200 rounded-sm" />
            <span>White Fields = Formula Calculated (Read-only)</span>
          </div>
        </div>

        {/* Spreadsheet Container */}
        <div className="overflow-x-auto border border-slate-200 rounded-[1.5rem]">
          <table className="w-full text-left border-collapse min-w-[700px] text-xs">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                <th className="py-4 px-4 w-[50px]">No.</th>
                <th className="py-4 px-4 w-[250px]">Material / Category</th>
                <th className="py-4 px-4 w-[220px]">Quantity / Weight</th>
                <th className="py-4 px-4 w-[200px]">Rate</th>
                <th className="py-4 px-4 text-right pr-6 w-[200px]">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">

              {/* 1. Mill */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-4 font-bold text-slate-400">1</td>
                <td className="py-4 px-4 font-bold text-slate-800">Mill</td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <span className="w-16 font-bold text-slate-500 text-right">{millTons.toFixed(3)} Tons</span>
                    <input
                      type="number"
                      min="0"
                      value={bidEnquiry.millWeight}
                      placeholder="0"
                      onChange={(e) => setBidEnquiry({ ...bidEnquiry, millWeight: e.target.value })}
                      className="w-24 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                    />
                    <span className="font-bold text-slate-400">Lbs</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1.5 font-bold text-slate-500">
                    <span>@</span>
                    <span className="px-3 py-2 border border-slate-200 rounded-xl bg-white w-28 text-right">
                      ${millRatePerLb.toFixed(2)}
                    </span>
                    <span>/Lb</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-right pr-6">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="font-bold text-slate-400">=</span>
                    <span className="relative flex items-center">
                      <span className="absolute left-3 font-bold text-slate-800">$</span>
                      <input
                        type="number"
                        min="0"
                        value={bidEnquiry.millAmount}
                        placeholder="0"
                        onChange={(e) => setBidEnquiry({ ...bidEnquiry, millAmount: e.target.value })}
                        className="w-28 pl-6 pr-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                      />
                    </span>
                  </div>
                </td>
              </tr>

              {/* 2. Whse */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-4 font-bold text-slate-400">2</td>
                <td className="py-4 px-4 font-bold text-slate-800">Whse</td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <span className="w-16 font-bold text-slate-500 text-right">{warehouseTons.toFixed(3)} Tons</span>
                    <input
                      type="number"
                      min="0"
                      value={bidEnquiry.warehouseWeight}
                      placeholder="0"
                      onChange={(e) => setBidEnquiry({ ...bidEnquiry, warehouseWeight: e.target.value })}
                      className="w-24 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                    />
                    <span className="font-bold text-slate-400">Lbs</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1.5 font-bold text-slate-500">
                    <span>@</span>
                    <span className="px-3 py-2 border border-slate-200 rounded-xl bg-white w-28 text-right">
                      ${warehouseRatePerLb.toFixed(2)}
                    </span>
                    <span>/Lb</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-right pr-6">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="font-bold text-slate-400">=</span>
                    <span className="relative flex items-center">
                      <span className="absolute left-3 font-bold text-slate-800">$</span>
                      <input
                        type="number"
                        min="0"
                        value={bidEnquiry.warehouseAmount}
                        placeholder="0"
                        onChange={(e) => setBidEnquiry({ ...bidEnquiry, warehouseAmount: e.target.value })}
                        className="w-28 pl-6 pr-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                      />
                    </span>
                  </div>
                </td>
              </tr>

              {/* 3. Scrap */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-4 font-bold text-slate-400">3</td>
                <td className="py-4 px-4 font-bold text-slate-800">Scrap</td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <span className="w-16 font-bold text-slate-500 text-right">{scrapTons.toFixed(3)} Tons</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={bidEnquiry.scrapPercent}
                      placeholder="0.0"
                      onChange={(e) => setBidEnquiry({ ...bidEnquiry, scrapPercent: e.target.value })}
                      className="w-24 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                    />
                    <span className="font-bold text-slate-400">%</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="text-slate-400 font-medium italic">Scrap Factor</span>
                </td>
                <td className="py-4 px-4 text-right pr-6">
                  <div className="flex items-center justify-end gap-1.5 font-bold text-slate-500">
                    <span>=</span>
                    <span className="px-3 py-2 border border-slate-200 rounded-xl bg-white w-28 text-right">
                      ${scrapAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </td>
              </tr>

              {/* 4. Shop & Field Bolts */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-4 font-bold text-slate-400">4</td>
                <td className="py-4 px-4 font-bold text-slate-800">Shop & Field Bolts</td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <span className="w-16"></span>
                    <input
                      type="number"
                      min="0"
                      value={bidEnquiry.boltQty}
                      placeholder="0"
                      onChange={(e) => setBidEnquiry({ ...bidEnquiry, boltQty: e.target.value })}
                      className="w-24 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                    />
                    <span className="font-bold text-slate-400">Pcs</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1.5 font-bold text-slate-500">
                    <span>@</span>
                    <span className="relative flex items-center">
                      <span className="absolute left-3 font-bold text-slate-800">$</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={bidEnquiry.boltRate}
                        onChange={(e) => setBidEnquiry({ ...bidEnquiry, boltRate: e.target.value })}
                        className="w-28 pl-6 pr-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                      />
                    </span>
                    <span>/Pc</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-right pr-6">
                  <div className="flex items-center justify-end gap-1.5 font-bold text-slate-500">
                    <span>=</span>
                    <span className="px-3 py-2 border border-slate-200 rounded-xl bg-white w-28 text-right">
                      ${boltAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </td>
              </tr>

              {/* 5. Paint */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-4 font-bold text-slate-400">5</td>
                <td className="py-4 px-4 font-bold text-slate-800">Paint</td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <span className="w-16"></span>
                    <input
                      type="number"
                      min="0"
                      value={bidEnquiry.paintQty}
                      placeholder="0"
                      onChange={(e) => setBidEnquiry({ ...bidEnquiry, paintQty: e.target.value })}
                      className="w-24 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                    />
                    <span className="font-bold text-slate-400">Gallons</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1.5 font-bold text-slate-500">
                    <span>@</span>
                    <span className="relative flex items-center">
                      <span className="absolute left-3 font-bold text-slate-800">$</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={bidEnquiry.paintRate}
                        onChange={(e) => setBidEnquiry({ ...bidEnquiry, paintRate: e.target.value })}
                        className="w-28 pl-6 pr-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                      />
                    </span>
                    <span>/Gallon</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-right pr-6">
                  <div className="flex items-center justify-end gap-1.5 font-bold text-slate-500">
                    <span>=</span>
                    <span className="px-3 py-2 border border-slate-200 rounded-xl bg-white w-28 text-right">
                      ${paintAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </td>
              </tr>

              {/* 6. Galvanizing */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-4 font-bold text-slate-400">6</td>
                <td className="py-4 px-4 font-bold text-slate-800">Galvanizing</td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <span className="w-16 font-bold text-slate-500 text-right">{adjustedGalvanizedWeight.toFixed(0)} Lbs</span>
                    <input
                      type="number"
                      min="0"
                      value={bidEnquiry.galvanizingWeight}
                      placeholder="0"
                      onChange={(e) => setBidEnquiry({ ...bidEnquiry, galvanizingWeight: e.target.value })}
                      className="w-24 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                    />
                    <span className="font-bold text-slate-400">Lbs + 5%</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1.5 font-bold text-slate-500">
                    <span>@</span>
                    <span className="relative flex items-center">
                      <span className="absolute left-3 font-bold text-slate-800">$</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={bidEnquiry.galvanizingRate}
                        onChange={(e) => setBidEnquiry({ ...bidEnquiry, galvanizingRate: e.target.value })}
                        className="w-28 pl-6 pr-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                      />
                    </span>
                    <span>/Lb</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-right pr-6">
                  <div className="flex items-center justify-end gap-1.5 font-bold text-slate-500">
                    <span>=</span>
                    <span className="px-3 py-2 border border-slate-200 rounded-xl bg-white w-28 text-right">
                      ${galvanizingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </td>
              </tr>

              {/* 7. Miscellaneous Items */}
              {bidEnquiry.miscItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-400">{idx === 0 ? "7" : ""}</td>
                  <td className="py-4 px-4 font-bold text-slate-800">
                    {idx === 0 ? "Miscellaneous:" : ""}
                  </td>
                  <td className="py-4 px-4" colSpan="2">
                    <input
                      type="text"
                      value={item.name}
                      placeholder={idx === 0 ? "e.g. Weld Wire" : idx === 1 ? "e.g. anchor bolts" : "Enter description..."}
                      onChange={(e) => handleMiscTextChange(item.id, e.target.value)}
                      className="w-full max-w-md px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-semibold transition-all"
                    />
                  </td>
                  <td className="py-4 px-4 text-right pr-6">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="font-bold text-slate-400">=</span>
                      <span className="relative flex items-center">
                        <span className="absolute left-3 font-bold text-slate-800">$</span>
                        <input
                          type="number"
                          min="0"
                          value={item.amount}
                          placeholder="0"
                          onChange={(e) => handleMiscAmountChange(item.id, e.target.value)}
                          className="w-28 pl-6 pr-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                        />
                      </span>
                    </div>
                  </td>
                </tr>
              ))}

              {/* 8. Total Direct Costs */}
              <tr className="bg-slate-50/50 border-t-2 border-slate-200">
                <td className="py-4 px-4 font-bold text-slate-400">8</td>
                <td className="py-4 px-4 font-extrabold text-slate-900 text-sm" colSpan="3">
                  Total Direct Costs
                </td>
                <td className="py-4 px-4 text-right pr-6">
                  <div className="flex items-center justify-end gap-1.5 font-extrabold text-slate-900 text-sm">
                    <span>=</span>
                    <span className="px-3 py-2 border-2 border-slate-300 rounded-xl bg-white w-28 text-right shadow-sm">
                      ${totalDirectCosts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </td>
              </tr>

              {/* 9. Use Tax */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-4 font-bold text-slate-400">9</td>
                <td className="py-4 px-4 font-bold text-slate-800">Use Tax</td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <span className="w-16 font-bold text-slate-400 text-right">Tax Rate</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={bidEnquiry.taxPercent}
                      placeholder="6.0"
                      onChange={(e) => setBidEnquiry({ ...bidEnquiry, taxPercent: e.target.value })}
                      className="w-24 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                    />
                    <span className="font-bold text-slate-400">%</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="text-slate-400 font-medium italic">Sales Tax Applied</span>
                </td>
                <td className="py-4 px-4 text-right pr-6">
                  <div className="flex items-center justify-end gap-1.5 font-bold text-slate-500">
                    <span>=</span>
                    <span className="px-3 py-2 border border-slate-200 rounded-xl bg-white w-28 text-right">
                      ${useTaxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </td>
              </tr>

              {/* Total Bid Material Cost Summary Row */}
              <tr className="bg-amber-50/30 border-t-2 border-amber-100 font-black text-sm">
                <td className="py-5 px-4"></td>
                <td className="py-5 px-4 text-amber-900 text-base" colSpan="3">
                  TOTAL BID MATERIAL COST
                </td>
                <td className="py-5 px-4 text-right pr-6">
                  <div className="flex items-center justify-end gap-1.5 text-amber-955 text-base">
                    <span>=</span>
                    <span className="px-4 py-2.5 bg-amber-500 text-white rounded-xl w-36 text-right shadow-md border border-amber-600 font-black tracking-wide">
                      ${totalBidMaterialCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
