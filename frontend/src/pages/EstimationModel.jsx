import { useState, useEffect } from 'react';
import {
  Calculator,
  Trash2,
  FileText,
  X,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { projectAPI } from '../services/api';

export default function EstimationModel() {
  // --- State for Modal ---
  const [activeSection, setActiveSection] = useState(null);

  // --- State for Project Info ---
  const [projectInfo, setProjectInfo] = useState(() => {
    const saved = localStorage.getItem('sfe_est_project');
    const parsed = saved ? JSON.parse(saved) : null;
    return parsed ? { projectId: '', ...parsed } : {
      projectId: '',
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

  // --- State for Bid Enquiry Sheet (Material Section) ---
  const [bidEnquiry, setBidEnquiry] = useState(() => {
    const saved = localStorage.getItem('sfe_est_bid_enquiry');
    return saved ? JSON.parse(saved) : {
      millWeight: '',
      millAmount: '',
      warehouseWeight: '',
      warehouseAmount: '',
      scrapPercent: 5.0,
      boltQty: '',
      boltRate: '1.75',
      paintQty: '',
      paintRate: '22.20',
      galvanizingWeight: '',
      galvanizingRate: '0.40',
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

  // --- State for all other 6 Estimation Sections ---
  const [estimationSections, setEstimationSections] = useState(() => {
    const saved = localStorage.getItem('sfe_est_sections');
    return saved ? JSON.parse(saved) : {
      // Shop Labor
      shopFabricationHours: '',
      miscLaborHours: '',
      miscLaborOtherHours: '',
      totalPieces: '',
      hourlyLaborRate: 60.0,
      numTrucks: '',
      hoursPerTruck: '',
      galvanizingTrucks: '',
      galvHoursPerTruck: 5.0,
      shippingRate: 195.0,

      // Drafting
      subletDetailingCost: '',
      peStampCost: '',
      otherDirectCosts: '',

      // Profit on Direct Costs
      overheadPercent: 12.0,

      // Buyouts
      steelJoistCost: '',
      deckCost: '',
      subletErectionCost: '',
      miscMetalCost: '',
      oshaLinearFeet: '',
      additionalSafetyCosts: '',
      ccipCosts: '',
      leedSubmissionCost: '',
      suppliedMaterialCost: '',
      useTaxPercent: 6.0,

      // Profit on Buyouts
      buyoutOverheadPercent: 12.0,

      // Final Totals
      profitPercent: 10.0,
      miscCharges: ''
    };
  });

  // --- State and Effect for Project Master Dropdown ---
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const res = await projectAPI.getAll();
        const data = res.data.results || res.data;
        if (Array.isArray(data)) {
          setProjects(data);
        }
      } catch (err) {
        console.error('Failed to fetch project master list:', err);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  const handleProjectChange = (e) => {
    const projId = e.target.value;
    if (!projId) {
      setProjectInfo(prev => ({
        ...prev,
        projectId: '',
        project: '',
        quoteNum: '',
        salesman: '',
        startDate: ''
      }));
      return;
    }
    const selected = projects.find(p => String(p.id) === String(projId));
    if (selected) {
      setProjectInfo(prev => ({
        ...prev,
        projectId: selected.id,
        project: selected.name,
        quoteNum: selected.code || '',
        salesman: selected.project_manager_name || '',
        startDate: selected.erection_date || ''
      }));
    }
  };

  // Auto-save to Local Storage
  useEffect(() => {
    localStorage.setItem('sfe_est_project', JSON.stringify(projectInfo));
  }, [projectInfo]);

  useEffect(() => {
    localStorage.setItem('sfe_est_bid_enquiry', JSON.stringify(bidEnquiry));
  }, [bidEnquiry]);

  useEffect(() => {
    localStorage.setItem('sfe_est_sections', JSON.stringify(estimationSections));
  }, [estimationSections]);

  // --- Calculations ---

  // ── Material Section ──
  // 1. Mill
  const millWeightVal = Number(bidEnquiry.millWeight) || 0;
  const millAmountVal = Number(bidEnquiry.millAmount) || 0;
  const millTons = Number((millWeightVal / 2000).toFixed(3));
  const millRatePerLb = millWeightVal < 1 ? 0 : millAmountVal / millWeightVal;

  // 2. Whse
  const warehouseWeightVal = Number(bidEnquiry.warehouseWeight) || 0;
  const warehouseAmountVal = Number(bidEnquiry.warehouseAmount) || 0;
  const warehouseTons = Number((warehouseWeightVal / 2000).toFixed(3));
  const warehouseRatePerLb = warehouseWeightVal < 1 ? 0 : warehouseAmountVal / warehouseWeightVal;

  // 3. Scrap
  const scrapPercentVal = Number(bidEnquiry.scrapPercent) || 0;
  const scrapTons = Number((millTons + warehouseTons).toFixed(3));
  const scrapAmount = (millAmountVal + warehouseAmountVal) * scrapPercentVal / 100;

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

  // 8. Total Material Direct Costs
  const totalMaterialDirectCosts =
    millAmountVal +
    warehouseAmountVal +
    scrapAmount +
    boltAmount +
    paintAmount +
    galvanizingAmount +
    miscSubtotal;

  // 9. Material Use Tax
  const taxPercentVal = Number(bidEnquiry.taxPercent) || 0;
  const materialUseTaxAmount = totalMaterialDirectCosts * (taxPercentVal / 100);

  // Total Material Cost
  const totalMaterialCost = totalMaterialDirectCosts + materialUseTaxAmount;

  // ── Grand Tonnage ──
  const totalTons = Number((millTons + warehouseTons).toFixed(3));

  // ── Section 1: Shop Labor Calculations ──
  const shopFabricationHoursVal = Number(estimationSections.shopFabricationHours) || 0;
  const miscLaborHoursVal = Number(estimationSections.miscLaborHours) || 0;
  const miscLaborOtherHoursVal = Number(estimationSections.miscLaborOtherHours) || 0;
  const totalPiecesVal = Number(estimationSections.totalPieces) || 0;
  const hourlyLaborRateVal = Number(estimationSections.hourlyLaborRate) || 0;
  const numTrucksVal = Number(estimationSections.numTrucks) || 0;
  const hoursPerTruckVal = Number(estimationSections.hoursPerTruck) || 0;
  const galvanizingTrucksVal = Number(estimationSections.galvanizingTrucks) || 0;
  const galvHoursPerTruckVal = Number(estimationSections.galvHoursPerTruck) || 0;
  const shippingRateVal = Number(estimationSections.shippingRate) || 0;

  const totalLaborHours = shopFabricationHoursVal + miscLaborHoursVal + miscLaborOtherHoursVal;
  const manHoursPerTon = totalTons > 0 ? totalLaborHours / totalTons : 0;
  const piecesPerTon = totalTons > 0 ? totalPiecesVal / totalTons : 0;
  const totalDirectShopCost = totalLaborHours * hourlyLaborRateVal;

  const freightOutCost = numTrucksVal * hoursPerTruckVal;
  const freightGalvanizingCost = galvanizingTrucksVal * galvHoursPerTruckVal;
  const totalShippingHours = freightOutCost + freightGalvanizingCost;
  const totalShippingCost = totalShippingHours * shippingRateVal;

  // ── Section 2: Drafting & Direct Costs Calculations ──
  const subletDetailingCostVal = Number(estimationSections.subletDetailingCost) || 0;
  const peStampCostVal = Number(estimationSections.peStampCost) || 0;
  const otherDirectCostsVal = Number(estimationSections.otherDirectCosts) || 0;

  const subletDetailingCostPerTon = totalTons > 0 ? subletDetailingCostVal / totalTons : 0;
  const peStampCostPerTon = totalTons > 0 ? peStampCostVal / totalTons : 0;
  const totalDirectDraftingCost = subletDetailingCostVal + peStampCostVal;

  // Include material cost in direct costs
  const totalDirectCosts = totalMaterialCost + totalDirectShopCost + totalShippingCost + totalDirectDraftingCost + otherDirectCostsVal;
  const directCostPerTon = totalTons > 0 ? totalDirectCosts / totalTons : 0;

  // ── Section 3: Profit on Direct Costs ──
  const overheadPercentVal = Number(estimationSections.overheadPercent) || 0;
  const directCostOverhead = totalDirectCosts * (overheadPercentVal / 100);
  const bidAmountOnDirectCosts = totalDirectCosts + directCostOverhead;
  const bidAmountPerTon = totalTons > 0 ? bidAmountOnDirectCosts / totalTons : 0;

  // ── Section 4: Buyouts Calculations ──
  const steelJoistCostVal = Number(estimationSections.steelJoistCost) || 0;
  const deckCostVal = Number(estimationSections.deckCost) || 0;
  const subletErectionCostVal = Number(estimationSections.subletErectionCost) || 0;
  const miscMetalCostVal = Number(estimationSections.miscMetalCost) || 0;
  const oshaLinearFeetVal = Number(estimationSections.oshaLinearFeet) || 0;
  const additionalSafetyCostsVal = Number(estimationSections.additionalSafetyCosts) || 0;
  const ccipCostsVal = Number(estimationSections.ccipCosts) || 0;
  const leedSubmissionCostVal = Number(estimationSections.leedSubmissionCost) || 0;
  const suppliedMaterialCostVal = Number(estimationSections.suppliedMaterialCost) || 0;
  const useTaxPercentVal = Number(estimationSections.useTaxPercent) || 0;

  const subletErectionCostPerTon = totalTons > 0 ? subletErectionCostVal / totalTons : 0;
  const oshaPostsCost = (oshaLinearFeetVal / 5) * 50;
  const safetyCost = additionalSafetyCostsVal + ccipCostsVal;
  const totalDirectBuyoutCosts = steelJoistCostVal + deckCostVal + subletErectionCostVal + miscMetalCostVal + oshaPostsCost + safetyCost + leedSubmissionCostVal;
  const useTax = suppliedMaterialCostVal * (useTaxPercentVal / 100);
  const totalBuyoutCosts = totalDirectBuyoutCosts + useTax;

  // ── Section 5: Profit on Buyouts ──
  const buyoutOverheadPercentVal = Number(estimationSections.buyoutOverheadPercent) || 0;
  const buyoutOverhead = totalBuyoutCosts * (buyoutOverheadPercentVal / 100);
  const bidAmountOnBuyouts = totalBuyoutCosts + buyoutOverhead;

  // ── Section 6: Final Totals ──
  const profitPercentVal = Number(estimationSections.profitPercent) || 0;
  const miscChargesVal = Number(estimationSections.miscCharges) || 0;

  const totalAmountBeforeProfit = bidAmountOnDirectCosts + bidAmountOnBuyouts;
  const profitAmount = totalAmountBeforeProfit * (profitPercentVal / 100);
  const finalAmountBeforeMisc = totalAmountBeforeProfit + profitAmount;
  const finalBidAmount = finalAmountBeforeMisc + miscChargesVal;

  // Clear Form handler
  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear all fields?")) {
      setProjectInfo({
        projectId: '',
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
        boltRate: '1.75',
        paintQty: '',
        paintRate: '22.20',
        galvanizingWeight: '',
        galvanizingRate: '0.40',
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
      setEstimationSections({
        shopFabricationHours: '',
        miscLaborHours: '',
        miscLaborOtherHours: '',
        totalPieces: '',
        hourlyLaborRate: 60.0,
        numTrucks: '',
        hoursPerTruck: '',
        galvanizingTrucks: '',
        galvHoursPerTruck: 5.0,
        shippingRate: 195.0,
        subletDetailingCost: '',
        peStampCost: '',
        otherDirectCosts: '',
        overheadPercent: 12.0,
        steelJoistCost: '',
        deckCost: '',
        subletErectionCost: '',
        miscMetalCost: '',
        oshaLinearFeet: '',
        additionalSafetyCosts: '',
        ccipCosts: '',
        leedSubmissionCost: '',
        suppliedMaterialCost: '',
        useTaxPercent: 6.0,
        buyoutOverheadPercent: 12.0,
        profitPercent: 10.0,
        miscCharges: ''
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

  // ── Modal Content Render Helpers ──
  const renderMaterialSection = () => {
    return (
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
                <div className="flex items-center gap-1.5 font-bold text-slate-505">
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
                <div className="flex items-center gap-1.5 font-bold text-slate-505">
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
                    ${scrapAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                <div className="flex items-center gap-1.5 font-bold text-slate-505">
                  <span>@</span>
                  <span className="px-3 py-2 border border-slate-200 rounded-xl bg-white w-28 text-right">
                    ${Number(bidEnquiry.boltRate).toFixed(2)}
                  </span>
                  <span>/Pc</span>
                </div>
              </td>
              <td className="py-4 px-4 text-right pr-6">
                <div className="flex items-center justify-end gap-1.5 font-bold text-slate-505">
                  <span>=</span>
                  <span className="px-3 py-2 border border-slate-200 rounded-xl bg-white w-28 text-right">
                    ${boltAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                <div className="flex items-center gap-1.5 font-bold text-slate-505">
                  <span>@</span>
                  <span className="px-3 py-2 border border-slate-200 rounded-xl bg-white w-28 text-right">
                    ${Number(bidEnquiry.paintRate).toFixed(2)}
                  </span>
                  <span>/Gallon</span>
                </div>
              </td>
              <td className="py-4 px-4 text-right pr-6">
                <div className="flex items-center justify-end gap-1.5 font-bold text-slate-505">
                  <span>=</span>
                  <span className="px-3 py-2 border border-slate-200 rounded-xl bg-white w-28 text-right">
                    ${paintAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                <div className="flex items-center gap-1.5 font-bold text-slate-505">
                  <span>@</span>
                  <span className="px-3 py-2 border border-slate-200 rounded-xl bg-white w-28 text-right">
                    ${Number(bidEnquiry.galvanizingRate).toFixed(2)}
                  </span>
                  <span>/Lb</span>
                </div>
              </td>
              <td className="py-4 px-4 text-right pr-6">
                <div className="flex items-center justify-end gap-1.5 font-bold text-slate-505">
                  <span>=</span>
                  <span className="px-3 py-2 border border-slate-200 rounded-xl bg-white w-28 text-right">
                    ${galvanizingAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                Total Material Direct Costs
              </td>
              <td className="py-4 px-4 text-right pr-6">
                <div className="flex items-center justify-end gap-1.5 font-extrabold text-slate-900 text-sm">
                  <span>=</span>
                  <span className="px-3 py-2 border-2 border-slate-300 rounded-xl bg-white w-28 text-right shadow-sm">
                    ${totalMaterialDirectCosts.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                <div className="flex items-center justify-end gap-1.5 font-bold text-slate-555">
                  <span>=</span>
                  <span className="px-3 py-2 border border-slate-200 rounded-xl bg-white w-28 text-right">
                    ${materialUseTaxAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderShopLaborSection = () => {
    return (
      <div className="overflow-x-auto border border-slate-200 rounded-[1.5rem]">
        <table className="w-full text-left border-collapse min-w-[700px] text-xs">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <th className="py-4 px-4 w-[50px]">No.</th>
              <th className="py-4 px-4 w-[250px]">Labor / Category</th>
              <th className="py-4 px-4 w-[220px]">Quantity / Hours</th>
              <th className="py-4 px-4 w-[200px]">Rate</th>
              <th className="py-4 px-4 text-right pr-6 w-[200px]">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150">
            {/* 1. Shop Fabrication */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">1</td>
              <td className="py-4 px-4 font-bold text-slate-800">Shop Fabrication Hours</td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={estimationSections.shopFabricationHours}
                    placeholder="0"
                    onChange={(e) => setEstimationSections({ ...estimationSections, shopFabricationHours: e.target.value })}
                    className="w-24 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                  />
                  <span className="font-bold text-slate-400">Hrs</span>
                </div>
              </td>
              <td className="py-4 px-4">
                <span className="font-bold text-slate-500">
                  {manHoursPerTon.toFixed(2)} Hrs/Ton
                </span>
              </td>
              <td className="py-4 px-4 text-right pr-6">
                <span className="text-slate-400 italic">Calculated per ton</span>
              </td>
            </tr>

            {/* 2. Misc Labor */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">2</td>
              <td className="py-4 px-4 font-bold text-slate-800">Misc Labor Hours</td>
              <td className="py-4 px-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-slate-400 font-semibold text-[10px]">MISC:</span>
                    <input
                      type="number"
                      min="0"
                      value={estimationSections.miscLaborHours}
                      placeholder="0"
                      onChange={(e) => setEstimationSections({ ...estimationSections, miscLaborHours: e.target.value })}
                      className="w-24 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                    />
                    <span className="font-bold text-slate-400">Hrs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-slate-400 font-semibold text-[10px]">OTHER:</span>
                    <input
                      type="number"
                      min="0"
                      value={estimationSections.miscLaborOtherHours}
                      placeholder="0"
                      onChange={(e) => setEstimationSections({ ...estimationSections, miscLaborOtherHours: e.target.value })}
                      className="w-24 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                    />
                    <span className="font-bold text-slate-400">Hrs</span>
                  </div>
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex flex-col gap-1.5 justify-center">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold">PIECES:</span>
                    <input
                      type="number"
                      min="0"
                      value={estimationSections.totalPieces}
                      placeholder="0"
                      onChange={(e) => setEstimationSections({ ...estimationSections, totalPieces: e.target.value })}
                      className="w-20 px-2 py-1 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-200 focus:border-amber-500 rounded-lg outline-none font-bold text-right text-xs"
                    />
                  </div>
                  <span className="font-bold text-slate-500">{piecesPerTon.toFixed(2)} Pcs/Ton</span>
                </div>
              </td>
              <td className="py-4 px-4 text-right pr-6">
                <span className="text-slate-400 italic">Calculated pieces/ton</span>
              </td>
            </tr>

            {/* 3. Total Direct Shop Cost */}
            <tr className="hover:bg-slate-50/50 transition-colors bg-slate-50/30">
              <td className="py-4 px-4 font-bold text-slate-400">3</td>
              <td className="py-4 px-4 font-bold text-slate-800">Total Direct Shop Cost</td>
              <td className="py-4 px-4">
                <span className="font-bold text-slate-500">{totalLaborHours} Total Hrs</span>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-400">@</span>
                  <span className="relative flex items-center">
                    <span className="absolute left-2.5 font-bold text-slate-800">$</span>
                    <input
                      type="number"
                      min="0"
                      value={estimationSections.hourlyLaborRate}
                      onChange={(e) => setEstimationSections({ ...estimationSections, hourlyLaborRate: e.target.value })}
                      className="w-20 pl-5 pr-2 py-1.5 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 rounded-xl outline-none font-bold text-right"
                    />
                  </span>
                  <span className="font-bold text-slate-400 ml-1">/Hr</span>
                </div>
              </td>
              <td className="py-4 px-4 text-right pr-6">
                <span className="font-bold text-slate-800">
                  =${totalDirectShopCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </td>
            </tr>

            {/* 4. Freight Out Destination */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">4</td>
              <td className="py-4 px-4 font-bold text-slate-800">Freight Out Destination</td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={estimationSections.numTrucks}
                    placeholder="Trucks"
                    onChange={(e) => setEstimationSections({ ...estimationSections, numTrucks: e.target.value })}
                    className="w-20 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                  />
                  <span className="font-bold text-slate-400">Trucks</span>
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={estimationSections.hoursPerTruck}
                    placeholder="Hrs/Truck"
                    onChange={(e) => setEstimationSections({ ...estimationSections, hoursPerTruck: e.target.value })}
                    className="w-24 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 rounded-xl outline-none font-bold text-right"
                  />
                  <span className="font-bold text-slate-400">Hrs/Truck</span>
                </div>
              </td>
              <td className="py-4 px-4 text-right pr-6 font-bold text-slate-650">
                ={freightOutCost.toFixed(1)} Hrs
              </td>
            </tr>

            {/* 5. Freight Galvanizing */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">5</td>
              <td className="py-4 px-4 font-bold text-slate-800">Freight Galvanizing</td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={estimationSections.galvanizingTrucks}
                    placeholder="Trucks"
                    onChange={(e) => setEstimationSections({ ...estimationSections, galvanizingTrucks: e.target.value })}
                    className="w-20 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                  />
                  <span className="font-bold text-slate-400">Trucks</span>
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={estimationSections.galvHoursPerTruck}
                    placeholder="5"
                    onChange={(e) => setEstimationSections({ ...estimationSections, galvHoursPerTruck: e.target.value })}
                    className="w-24 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 rounded-xl outline-none font-bold text-right"
                  />
                  <span className="font-bold text-slate-400">Hrs/Truck</span>
                </div>
              </td>
              <td className="py-4 px-4 text-right pr-6 font-bold text-slate-650">
                ={freightGalvanizingCost.toFixed(1)} Hrs
              </td>
            </tr>

            {/* 6. Total Shipping Cost */}
            <tr className="hover:bg-slate-50/50 transition-colors bg-slate-50/30">
              <td className="py-4 px-4 font-bold text-slate-400">6</td>
              <td className="py-4 px-4 font-bold text-slate-800">Total Shipping Cost</td>
              <td className="py-4 px-4">
                <span className="font-bold text-slate-500">{totalShippingHours.toFixed(1)} Total Hrs</span>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-400">@</span>
                  <span className="relative flex items-center">
                    <span className="absolute left-2.5 font-bold text-slate-855">$</span>
                    <input
                      type="number"
                      min="0"
                      value={estimationSections.shippingRate}
                      onChange={(e) => setEstimationSections({ ...estimationSections, shippingRate: e.target.value })}
                      className="w-20 pl-5 pr-2 py-1.5 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 rounded-xl outline-none font-bold text-right"
                    />
                  </span>
                  <span className="font-bold text-slate-400 ml-1">/Hr</span>
                </div>
              </td>
              <td className="py-4 px-4 text-right pr-6">
                <span className="font-bold text-slate-800">
                  =${totalShippingCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderDraftingSection = () => {
    return (
      <div className="overflow-x-auto border border-slate-200 rounded-[1.5rem]">
        <table className="w-full text-left border-collapse min-w-[700px] text-xs">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <th className="py-4 px-4 w-[50px]">No.</th>
              <th className="py-4 px-4 w-[250px]">Drafting / Category</th>
              <th className="py-4 px-4 w-[220px]">Input Cost</th>
              <th className="py-4 px-4 w-[200px]">Cost Per Ton</th>
              <th className="py-4 px-4 text-right pr-6 w-[200px]">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150">
            {/* 7. Sublet Detailing */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">7</td>
              <td className="py-4 px-4 font-bold text-slate-800">Sublet Detailing Cost</td>
              <td className="py-4 px-4">
                <span className="relative flex items-center max-w-[150px]">
                  <span className="absolute left-3 font-bold text-slate-800">$</span>
                  <input
                    type="number"
                    min="0"
                    value={estimationSections.subletDetailingCost}
                    placeholder="0"
                    onChange={(e) => setEstimationSections({ ...estimationSections, subletDetailingCost: e.target.value })}
                    className="w-full pl-6 pr-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                  />
                </span>
              </td>
              <td className="py-4 px-4 font-bold text-slate-500">
                ${subletDetailingCostPerTon.toFixed(2)} /Ton
              </td>
              <td className="py-4 px-4 text-right pr-6 font-bold text-slate-800">
                =${subletDetailingCostVal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </td>
            </tr>

            {/* 8. PE Stamp */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">8</td>
              <td className="py-4 px-4 font-bold text-slate-800">PE Stamp Cost</td>
              <td className="py-4 px-4">
                <span className="relative flex items-center max-w-[150px]">
                  <span className="absolute left-3 font-bold text-slate-800">$</span>
                  <input
                    type="number"
                    min="0"
                    value={estimationSections.peStampCost}
                    placeholder="0"
                    onChange={(e) => setEstimationSections({ ...estimationSections, peStampCost: e.target.value })}
                    className="w-full pl-6 pr-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                  />
                </span>
              </td>
              <td className="py-4 px-4 font-bold text-slate-500">
                ${peStampCostPerTon.toFixed(2)} /Ton
              </td>
              <td className="py-4 px-4 text-right pr-6 font-bold text-slate-800">
                =${peStampCostVal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </td>
            </tr>

            {/* 9. Total Direct Drafting Cost */}
            <tr className="hover:bg-slate-50/50 transition-colors bg-slate-50/30">
              <td className="py-4 px-4 font-bold text-slate-400">9</td>
              <td className="py-4 px-4 font-bold text-slate-800">Total Direct Drafting Cost</td>
              <td className="py-4 px-4">
                <span className="font-semibold text-slate-400 italic">Subtotal</span>
              </td>
              <td className="py-4 px-4 font-bold text-slate-500">
                ${(totalDirectDraftingCost / (totalTons || 1)).toFixed(2)} /Ton
              </td>
              <td className="py-4 px-4 text-right pr-6 font-bold text-slate-805">
                =${totalDirectDraftingCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </td>
            </tr>

            {/* Other Direct Costs */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">-</td>
              <td className="py-4 px-4 font-bold text-slate-800">Other Direct Costs</td>
              <td className="py-4 px-4">
                <span className="relative flex items-center max-w-[150px]">
                  <span className="absolute left-3 font-bold text-slate-800">$</span>
                  <input
                    type="number"
                    min="0"
                    value={estimationSections.otherDirectCosts}
                    placeholder="0"
                    onChange={(e) => setEstimationSections({ ...estimationSections, otherDirectCosts: e.target.value })}
                    className="w-full pl-6 pr-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                  />
                </span>
              </td>
              <td className="py-4 px-4 font-bold text-slate-500">
                ${(otherDirectCostsVal / (totalTons || 1)).toFixed(2)} /Ton
              </td>
              <td className="py-4 px-4 text-right pr-6 font-bold text-slate-800">
                =${otherDirectCostsVal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </td>
            </tr>

            {/* 10. Total Direct Costs */}
            <tr className="hover:bg-slate-50/50 transition-colors bg-slate-50 border-t-2 border-slate-200">
              <td className="py-4 px-4 font-bold text-slate-400">10</td>
              <td className="py-4 px-4 font-black text-slate-900 text-sm">TOTAL DIRECT COSTS</td>
              <td className="py-4 px-4">
                <span className="text-[10px] text-slate-400 font-bold block">INCLUDES MATERIALS,</span>
                <span className="text-[10px] text-slate-400 font-bold block">LABOR, FREIGHT, DRAFTING</span>
              </td>
              <td className="py-4 px-4 font-black text-slate-900 text-sm">
                ${directCostPerTon.toFixed(2)} /Ton
              </td>
              <td className="py-4 px-4 text-right pr-6 font-black text-slate-900 text-sm">
                =${totalDirectCosts.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderProfitDirectSection = () => {
    return (
      <div className="overflow-x-auto border border-slate-200 rounded-[1.5rem]">
        <table className="w-full text-left border-collapse min-w-[700px] text-xs">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <th className="py-4 px-4 w-[50px]">No.</th>
              <th className="py-4 px-4 w-[250px]">Direct Costs / Profit Category</th>
              <th className="py-4 px-4 w-[220px]">Percentage</th>
              <th className="py-4 px-4 w-[200px]">Overhead / Per Ton</th>
              <th className="py-4 px-4 text-right pr-6 w-[200px]">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150">
            {/* 12. Overhead on Direct Costs */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">12</td>
              <td className="py-4 px-4 font-bold text-slate-800">Overhead On Direct Costs</td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={estimationSections.overheadPercent}
                    placeholder="12"
                    onChange={(e) => setEstimationSections({ ...estimationSections, overheadPercent: e.target.value })}
                    className="w-24 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                  />
                  <span className="font-bold text-slate-400">%</span>
                </div>
              </td>
              <td className="py-4 px-4 font-bold text-slate-500">
                ${(directCostOverhead / (totalTons || 1)).toFixed(2)} /Ton
              </td>
              <td className="py-4 px-4 text-right pr-6 font-bold text-slate-850">
                =${directCostOverhead.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </td>
            </tr>

            {/* 13. Bid Amount On Direct Costs */}
            <tr className="hover:bg-slate-50/50 transition-colors bg-slate-50 border-t-2 border-slate-200">
              <td className="py-4 px-4 font-bold text-slate-400">13</td>
              <td className="py-4 px-4 font-black text-slate-900 text-sm">BID AMOUNT ON DIRECT COSTS</td>
              <td className="py-4 px-4">
                <span className="font-semibold text-slate-400 italic">Total Directs + Overhead</span>
              </td>
              <td className="py-4 px-4 font-black text-slate-900 text-sm">
                ${bidAmountPerTon.toFixed(2)} /Ton
              </td>
              <td className="py-4 px-4 text-right pr-6 font-black text-slate-900 text-sm">
                =${bidAmountOnDirectCosts.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderBuyoutsSection = () => {
    return (
      <div className="overflow-x-auto border border-slate-200 rounded-[1.5rem]">
        <table className="w-full text-left border-collapse min-w-[700px] text-xs">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <th className="py-4 px-4 w-[50px]">No.</th>
              <th className="py-4 px-4 w-[250px]">Buyout Material / Service</th>
              <th className="py-4 px-4 w-[220px]">Quantity / Cost Input</th>
              <th className="py-4 px-4 w-[200px]">Per Ton Rate</th>
              <th className="py-4 px-4 text-right pr-6 w-[200px]">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150">
            {/* 15. Steel Joist and Deck */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">15</td>
              <td className="py-4 px-4 font-bold text-slate-800">Steel Joist And Deck</td>
              <td className="py-4 px-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-slate-400 font-semibold text-[10px]">JOIST:</span>
                    <span className="relative flex items-center max-w-[120px]">
                      <span className="absolute left-2 text-slate-500 font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        value={estimationSections.steelJoistCost}
                        placeholder="0"
                        onChange={(e) => setEstimationSections({ ...estimationSections, steelJoistCost: e.target.value })}
                        className="w-full pl-5 pr-2 py-1.5 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-250 focus:border-amber-500 rounded-lg outline-none font-bold text-right text-xs"
                      />
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-slate-400 font-semibold text-[10px]">DECK:</span>
                    <span className="relative flex items-center max-w-[120px]">
                      <span className="absolute left-2 text-slate-500 font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        value={estimationSections.deckCost}
                        placeholder="0"
                        onChange={(e) => setEstimationSections({ ...estimationSections, deckCost: e.target.value })}
                        className="w-full pl-5 pr-2 py-1.5 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-250 focus:border-amber-500 rounded-lg outline-none font-bold text-right text-xs"
                      />
                    </span>
                  </div>
                </div>
              </td>
              <td className="py-4 px-4 font-bold text-slate-500">
                ${((steelJoistCostVal + deckCostVal) / (totalTons || 1)).toFixed(2)} /Ton
              </td>
              <td className="py-4 px-4 text-right pr-6 font-bold text-slate-805">
                =${(steelJoistCostVal + deckCostVal).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </td>
            </tr>

            {/* 16. Sublet Erection */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">16</td>
              <td className="py-4 px-4 font-bold text-slate-800">Sublet Erection</td>
              <td className="py-4 px-4">
                <span className="relative flex items-center max-w-[150px]">
                  <span className="absolute left-3 font-bold text-slate-800">$</span>
                  <input
                    type="number"
                    min="0"
                    value={estimationSections.subletErectionCost}
                    placeholder="0"
                    onChange={(e) => setEstimationSections({ ...estimationSections, subletErectionCost: e.target.value })}
                    className="w-full pl-6 pr-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                  />
                </span>
              </td>
              <td className="py-4 px-4 font-bold text-slate-500">
                ${subletErectionCostPerTon.toFixed(2)} /Ton
              </td>
              <td className="py-4 px-4 text-right pr-6 font-bold text-slate-800">
                =${subletErectionCostVal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </td>
            </tr>

            {/* 17. Miscellaneous Metals */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">17</td>
              <td className="py-4 px-4 font-bold text-slate-800">Miscellaneous Metals Cost</td>
              <td className="py-4 px-4">
                <span className="relative flex items-center max-w-[150px]">
                  <span className="absolute left-3 font-bold text-slate-800">$</span>
                  <input
                    type="number"
                    min="0"
                    value={estimationSections.miscMetalCost}
                    placeholder="0"
                    onChange={(e) => setEstimationSections({ ...estimationSections, miscMetalCost: e.target.value })}
                    className="w-full pl-6 pr-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                  />
                </span>
              </td>
              <td className="py-4 px-4 font-bold text-slate-500">
                ${(miscMetalCostVal / (totalTons || 1)).toFixed(2)} /Ton
              </td>
              <td className="py-4 px-4 text-right pr-6 font-bold text-slate-800">
                =${miscMetalCostVal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </td>
            </tr>

            {/* 18. OSHA Posts */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">18</td>
              <td className="py-4 px-4 font-bold text-slate-800">OSHA Posts</td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={estimationSections.oshaLinearFeet}
                    placeholder="Linear Feet"
                    onChange={(e) => setEstimationSections({ ...estimationSections, oshaLinearFeet: e.target.value })}
                    className="w-28 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                  />
                  <span className="font-bold text-slate-400">Linear Ft</span>
                </div>
              </td>
              <td className="py-4 px-4 font-bold text-slate-500">
                @ $50 / 5 Ft
              </td>
              <td className="py-4 px-4 text-right pr-6 font-bold text-slate-800">
                =${oshaPostsCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </td>
            </tr>

            {/* 19. Safety */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">19</td>
              <td className="py-4 px-4 font-bold text-slate-800">Safety Costs</td>
              <td className="py-4 px-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-slate-400 font-semibold text-[10px]">SAFETY:</span>
                    <span className="relative flex items-center max-w-[120px]">
                      <span className="absolute left-2 text-slate-500 font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        value={estimationSections.additionalSafetyCosts}
                        placeholder="0"
                        onChange={(e) => setEstimationSections({ ...estimationSections, additionalSafetyCosts: e.target.value })}
                        className="w-full pl-5 pr-2 py-1.5 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-250 focus:border-amber-500 rounded-lg outline-none font-bold text-right text-xs"
                      />
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-slate-400 font-semibold text-[10px]">CCIP:</span>
                    <span className="relative flex items-center max-w-[120px]">
                      <span className="absolute left-2 text-slate-500 font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        value={estimationSections.ccipCosts}
                        placeholder="0"
                        onChange={(e) => setEstimationSections({ ...estimationSections, ccipCosts: e.target.value })}
                        className="w-full pl-5 pr-2 py-1.5 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-250 focus:border-amber-500 rounded-lg outline-none font-bold text-right text-xs"
                      />
                    </span>
                  </div>
                </div>
              </td>
              <td className="py-4 px-4 font-bold text-slate-500">
                ${(safetyCost / (totalTons || 1)).toFixed(2)} /Ton
              </td>
              <td className="py-4 px-4 text-right pr-6 font-bold text-slate-800">
                =${safetyCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </td>
            </tr>

            {/* 20. LEED */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">20</td>
              <td className="py-4 px-4 font-bold text-slate-800">LEED Submission</td>
              <td className="py-4 px-4">
                <span className="relative flex items-center max-w-[150px]">
                  <span className="absolute left-3 font-bold text-slate-800">$</span>
                  <input
                    type="number"
                    min="0"
                    value={estimationSections.leedSubmissionCost}
                    placeholder="0"
                    onChange={(e) => setEstimationSections({ ...estimationSections, leedSubmissionCost: e.target.value })}
                    className="w-full pl-6 pr-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                  />
                </span>
              </td>
              <td className="py-4 px-4 font-bold text-slate-500">
                ${(leedSubmissionCostVal / (totalTons || 1)).toFixed(2)} /Ton
              </td>
              <td className="py-4 px-4 text-right pr-6 font-bold text-slate-800">
                =${leedSubmissionCostVal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </td>
            </tr>

            {/* 21. Total Direct Buyout Costs */}
            <tr className="hover:bg-slate-50/50 transition-colors bg-slate-50/30">
              <td className="py-4 px-4 font-bold text-slate-400">21</td>
              <td className="py-4 px-4 font-bold text-slate-800">Total Direct Buyout Costs</td>
              <td className="py-4 px-4">
                <span className="font-semibold text-slate-400 italic">Subtotal</span>
              </td>
              <td className="py-4 px-4 font-bold text-slate-500">
                ${(totalDirectBuyoutCosts / (totalTons || 1)).toFixed(2)} /Ton
              </td>
              <td className="py-4 px-4 text-right pr-6 font-bold text-slate-800">
                =${totalDirectBuyoutCosts.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </td>
            </tr>

            {/* 22. Use Tax */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">22</td>
              <td className="py-4 px-4 font-bold text-slate-800">Use Tax (Material Buyout)</td>
              <td className="py-4 px-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-slate-400 font-bold text-[9px] uppercase">Material:</span>
                    <span className="relative flex items-center max-w-[120px]">
                      <span className="absolute left-2 text-slate-500 font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        value={estimationSections.suppliedMaterialCost}
                        placeholder="0"
                        onChange={(e) => setEstimationSections({ ...estimationSections, suppliedMaterialCost: e.target.value })}
                        className="w-full pl-5 pr-2 py-1.5 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-250 focus:border-amber-500 rounded-lg outline-none font-bold text-right text-xs"
                      />
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-slate-400 font-bold text-[9px] uppercase">Rate:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={estimationSections.useTaxPercent}
                      placeholder="6.0"
                      onChange={(e) => setEstimationSections({ ...estimationSections, useTaxPercent: e.target.value })}
                      className="w-16 px-2 py-1 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-250 focus:border-amber-500 rounded-lg outline-none font-bold text-right text-xs"
                    />
                    <span className="font-bold text-slate-400 text-xs">%</span>
                  </div>
                </div>
              </td>
              <td className="py-4 px-4 font-bold text-slate-500">
                ${(useTax / (totalTons || 1)).toFixed(2)} /Ton
              </td>
              <td className="py-4 px-4 text-right pr-6 font-bold text-slate-800">
                =${useTax.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </td>
            </tr>

            {/* 23. Total Buyout Costs */}
            <tr className="hover:bg-slate-50/50 transition-colors bg-slate-50 border-t-2 border-slate-200">
              <td className="py-4 px-4 font-bold text-slate-400">23</td>
              <td className="py-4 px-4 font-black text-slate-900 text-sm">TOTAL BUYOUT COSTS</td>
              <td className="py-4 px-4">
                <span className="font-semibold text-slate-400 italic">Buyout Directs + Use Tax</span>
              </td>
              <td className="py-4 px-4 font-black text-slate-900 text-sm">
                ${(totalBuyoutCosts / (totalTons || 1)).toFixed(2)} /Ton
              </td>
              <td className="py-4 px-4 text-right pr-6 font-black text-slate-900 text-sm">
                =${totalBuyoutCosts.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderProfitBuyoutsSection = () => {
    return (
      <div className="overflow-x-auto border border-slate-200 rounded-[1.5rem]">
        <table className="w-full text-left border-collapse min-w-[700px] text-xs">
          <thead>
            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <th className="py-4 px-4 w-[50px]">No.</th>
              <th className="py-4 px-4 w-[250px]">Buyout Overhead Category</th>
              <th className="py-4 px-4 w-[220px]">Percentage</th>
              <th className="py-4 px-4 w-[200px]">Per Ton Overhead</th>
              <th className="py-4 px-4 text-right pr-6 w-[200px]">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150">
            {/* 24. Buyout Overhead */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">24</td>
              <td className="py-4 px-4 font-bold text-slate-800">Buyout Overhead</td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={estimationSections.buyoutOverheadPercent}
                    placeholder="12"
                    onChange={(e) => setEstimationSections({ ...estimationSections, buyoutOverheadPercent: e.target.value })}
                    className="w-24 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                  />
                  <span className="font-bold text-slate-400">%</span>
                </div>
              </td>
              <td className="py-4 px-4 font-bold text-slate-500">
                ${(buyoutOverhead / (totalTons || 1)).toFixed(2)} /Ton
              </td>
              <td className="py-4 px-4 text-right pr-6 font-bold text-slate-855">
                =${buyoutOverhead.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </td>
            </tr>

            {/* 25. Bid Amount On Buyouts */}
            <tr className="hover:bg-slate-50/50 transition-colors bg-slate-50 border-t-2 border-slate-200">
              <td className="py-4 px-4 font-bold text-slate-400">25</td>
              <td className="py-4 px-4 font-black text-slate-900 text-sm">BID AMOUNT ON BUYOUTS</td>
              <td className="py-4 px-4">
                <span className="font-semibold text-slate-400 italic">Total Buyouts + Overhead</span>
              </td>
              <td className="py-4 px-4 font-black text-slate-900 text-sm">
                ${(bidAmountOnBuyouts / (totalTons || 1)).toFixed(2)} /Ton
              </td>
              <td className="py-4 px-4 text-right pr-6 font-black text-slate-900 text-sm">
                =${bidAmountOnBuyouts.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderFinalTotalsSection = () => {
    return (
      <div className="space-y-6">
        <div className="overflow-x-auto border border-slate-200 rounded-[1.5rem]">
          <table className="w-full text-left border-collapse min-w-[700px] text-xs">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                <th className="py-4 px-4 w-[50px]">No.</th>
                <th className="py-4 px-4 w-[250px]">Final Category</th>
                <th className="py-4 px-4 w-[220px]">Factor / Input</th>
                <th className="py-4 px-4 w-[200px]">Per Ton Rate</th>
                <th className="py-4 px-4 text-right pr-6 w-[200px]">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {/* 26. Total Amount Before Profit */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-4 font-bold text-slate-400">26</td>
                <td className="py-4 px-4 font-bold text-slate-800">Total Amount Before Profit</td>
                <td className="py-4 px-4">
                  <span className="font-semibold text-slate-400 italic">Direct Bid + Buyout Bid</span>
                </td>
                <td className="py-4 px-4 font-bold text-slate-500">
                  ${(totalAmountBeforeProfit / (totalTons || 1)).toFixed(2)} /Ton
                </td>
                <td className="py-4 px-4 text-right pr-6 font-bold text-slate-855">
                  =${totalAmountBeforeProfit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </td>
              </tr>

              {/* 27. Profit */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-4 font-bold text-slate-400">27</td>
                <td className="py-4 px-4 font-bold text-slate-800">Profit Amount</td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={estimationSections.profitPercent}
                      placeholder="10"
                      onChange={(e) => setEstimationSections({ ...estimationSections, profitPercent: e.target.value })}
                      className="w-24 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                    />
                    <span className="font-bold text-slate-400">%</span>
                  </div>
                </td>
                <td className="py-4 px-4 font-bold text-slate-505">
                  ${(profitAmount / (totalTons || 1)).toFixed(2)} /Ton
                </td>
                <td className="py-4 px-4 text-right pr-6 font-bold text-slate-850">
                  =${profitAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </td>
              </tr>

              {/* 28. Total Amount After Profit */}
              <tr className="hover:bg-slate-50/50 transition-colors bg-slate-50/50">
                <td className="py-4 px-4 font-bold text-slate-400">28</td>
                <td className="py-4 px-4 font-bold text-slate-800">Total Amount After Profit</td>
                <td className="py-4 px-4">
                  <span className="font-semibold text-slate-400 italic">Subtotal Before Charges</span>
                </td>
                <td className="py-4 px-4 font-bold text-slate-505">
                  ${(finalAmountBeforeMisc / (totalTons || 1)).toFixed(2)} /Ton
                </td>
                <td className="py-4 px-4 text-right pr-6 font-bold text-slate-850">
                  =${finalAmountBeforeMisc.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </td>
              </tr>

              {/* 29. Misc Charges */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-4 font-bold text-slate-400">29</td>
                <td className="py-4 px-4 font-bold text-slate-800">Miscellaneous Charges</td>
                <td className="py-4 px-4">
                  <span className="relative flex items-center max-w-[150px]">
                    <span className="absolute left-3 font-bold text-slate-800">$</span>
                    <input
                      type="number"
                      min="0"
                      value={estimationSections.miscCharges}
                      placeholder="0"
                      onChange={(e) => setEstimationSections({ ...estimationSections, miscCharges: e.target.value })}
                      className="w-full pl-6 pr-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                    />
                  </span>
                </td>
                <td className="py-4 px-4 font-bold text-slate-505">
                  ${(miscChargesVal / (totalTons || 1)).toFixed(2)} /Ton
                </td>
                <td className="py-4 px-4 text-right pr-6 font-bold text-slate-855">
                  =${miscChargesVal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 30. Final Bid Amount Prominent Display */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-[1.5rem] p-6 text-white flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg border border-amber-500/30">
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-amber-100">30. FINAL BID ESTIMATION AMOUNT</h4>
            <p className="text-xs text-amber-50 mt-1">This is the final calculated bid value for this estimation sheet.</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black">
              ${finalBidAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-xs font-bold text-amber-100">
              (${((finalBidAmount) / (totalTons || 1)).toFixed(2)}/Ton)
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-2 animate-fade-in">

      {/* ── Header Area ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
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

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Tonnage</span>
            <h4 className="text-xl font-extrabold text-slate-800 mt-1">{totalTons.toFixed(3)} Tons</h4>
          </div>
          <Calculator className="w-8 h-8 text-amber-500 bg-amber-50 p-1.5 rounded-xl animate-pulse" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Direct Costs</span>
            <h4 className="text-xl font-extrabold text-slate-800 mt-1">${totalDirectCosts.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h4>
          </div>
          <Calculator className="w-8 h-8 text-blue-500 bg-blue-50 p-1.5 rounded-xl" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Final Bid Amount</span>
            <h4 className="text-xl font-black text-amber-600 mt-1">${finalBidAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</h4>
          </div>
          <Calculator className="w-8 h-8 text-white bg-amber-500 p-1.5 rounded-xl" />
        </div>
      </div>

      {/* Two Column Layout on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Left Side: Project Specifications */}
        <div className="lg:col-span-2">
          {/* Card 1: Project Specifications */}
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
                  <div className="relative">
                    <select
                      value={projectInfo.projectId || ''}
                      onChange={handleProjectChange}
                      className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-semibold text-slate-750 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none appearance-none cursor-pointer"
                    >
                      <option value="">Select Project</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      {loadingProjects ? (
                        <Loader2 className="w-4.5 h-4.5 animate-spin" />
                      ) : (
                        <ChevronDown className="w-4.5 h-4.5" />
                      )}
                    </div>
                  </div>
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
        </div>

        {/* Right Side: Estimation Sections Navigation */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">
              Estimation Sections
            </h3>
            <div className="flex flex-col gap-3">
              {/* Button 1: Material Section */}
              <button
                onClick={() => setActiveSection('material')}
                className={`w-full flex items-center justify-between p-4 border rounded-2xl font-bold text-sm transition-all shadow-sm group hover:scale-[1.01] ${activeSection === 'material' ? 'bg-amber-500 border-amber-600 text-white' : 'bg-amber-50 hover:bg-amber-100/50 border-amber-200 text-amber-900'}`}
              >
                <div className="flex items-center gap-3">
                  <Calculator className={`w-5 h-5 ${activeSection === 'material' ? 'text-white' : 'text-amber-500'}`} />
                  <span>Material Section</span>
                </div>
                <span className={`${activeSection === 'material' ? 'text-white' : 'text-amber-500'} group-hover:translate-x-1 transition-transform`}>→</span>
              </button>

              {/* Button 2: Shop Labor */}
              <button
                onClick={() => setActiveSection('shopLabor')}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all shadow-sm group hover:scale-[1.01]"
              >
                <div className="flex items-center gap-3">
                  <Calculator className="w-5 h-5 text-slate-500" />
                  <span>Shop Labor</span>
                </div>
                <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
              </button>

              {/* Button 3: Drafting */}
              <button
                onClick={() => setActiveSection('drafting')}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all shadow-sm group hover:scale-[1.01]"
              >
                <div className="flex items-center gap-3">
                  <Calculator className="w-5 h-5 text-slate-500" />
                  <span>Drafting Section</span>
                </div>
                <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
              </button>

              {/* Button 4: Profit on Direct Costs */}
              <button
                onClick={() => setActiveSection('profitDirect')}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all shadow-sm group hover:scale-[1.01]"
              >
                <div className="flex items-center gap-3">
                  <Calculator className="w-5 h-5 text-slate-500" />
                  <span>Profit on Direct Costs</span>
                </div>
                <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
              </button>

              {/* Button 5: Buyouts */}
              <button
                onClick={() => setActiveSection('buyouts')}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all shadow-sm group hover:scale-[1.01]"
              >
                <div className="flex items-center gap-3">
                  <Calculator className="w-5 h-5 text-slate-500" />
                  <span>Buyouts Section</span>
                </div>
                <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
              </button>

              {/* Button 6: Profit on Buyouts */}
              <button
                onClick={() => setActiveSection('profitBuyouts')}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all shadow-sm group hover:scale-[1.01]"
              >
                <div className="flex items-center gap-3">
                  <Calculator className="w-5 h-5 text-slate-500" />
                  <span>Profit on Buyouts</span>
                </div>
                <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
              </button>

              {/* Button 7: Final Totals */}
              <button
                onClick={() => setActiveSection('finalTotals')}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all shadow-sm group hover:scale-[1.01]"
              >
                <div className="flex items-center gap-3">
                  <Calculator className="w-5 h-5 text-slate-500" />
                  <span>Final Totals</span>
                </div>
                <span className="text-slate-400 group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Popup Modal for all Sections */}
      {activeSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-in">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <Calculator className="w-6 h-6 text-amber-500" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {activeSection === 'material' && 'Material Section'}
                    {activeSection === 'shopLabor' && 'Shop Labor Section'}
                    {activeSection === 'drafting' && 'Drafting & Direct Costs'}
                    {activeSection === 'profitDirect' && 'Profit on Direct Costs'}
                    {activeSection === 'buyouts' && 'Buyouts Section'}
                    {activeSection === 'profitBuyouts' && 'Profit on Buyouts'}
                    {activeSection === 'finalTotals' && 'Final Totals Section'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {activeSection === 'material' && 'Perform calculations for mill, warehouse, and scrap materials.'}
                    {activeSection === 'shopLabor' && 'Perform calculations for shop fabrication hours and shipping costs.'}
                    {activeSection === 'drafting' && 'Perform calculations for sublet detailing, PE stamps, and total direct costs.'}
                    {activeSection === 'profitDirect' && 'Apply overhead percentage to total direct costs.'}
                    {activeSection === 'buyouts' && 'Calculate buyout material and erection expenses.'}
                    {activeSection === 'profitBuyouts' && 'Apply overhead percentage to buyout costs.'}
                    {activeSection === 'finalTotals' && 'Review totals, apply profit percentage, and calculate final bid amount.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSection(null)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-650 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin">
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

              {/* Render dynamic section */}
              {activeSection === 'material' && renderMaterialSection()}
              {activeSection === 'shopLabor' && renderShopLaborSection()}
              {activeSection === 'drafting' && renderDraftingSection()}
              {activeSection === 'profitDirect' && renderProfitDirectSection()}
              {activeSection === 'buyouts' && renderBuyoutsSection()}
              {activeSection === 'profitBuyouts' && renderProfitBuyoutsSection()}
              {activeSection === 'finalTotals' && renderFinalTotalsSection()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end gap-3 font-semibold text-xs">
              <button
                onClick={() => setActiveSection(null)}
                className="px-5 py-2.5 bg-slate-850 hover:bg-slate-900 text-white rounded-xl font-bold text-xs transition-colors shadow-sm"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
