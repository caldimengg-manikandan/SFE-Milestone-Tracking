import { useState, useEffect } from 'react';
import {
  Calculator,
  Trash2,
  FileText,
  X,
  ChevronDown,
  Loader2,
  BarChart3,
  Save
} from 'lucide-react';
import { projectAPI } from '../services/api';
import EstimationSummary from './EstimationSummary';
import { toast } from 'react-hot-toast';

const DEFAULT_PROJECT_INFO = {
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

const DEFAULT_BID_ENQUIRY = {
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

const DEFAULT_ESTIMATION_SECTIONS = {
  plantFabricationHours: '',
  miscLaborHours: '',
  miscLaborOtherHours: '',
  miscLaborOther2Hours: '',
  totalPieces: '',
  hourlyLaborRate: 60.0,
  numTrucks: 3,
  hoursPerTruck: 3,
  galvanizingTrucks: 5,
  galvHoursPerTruck: 5.0,
  shippingRate: 195.0,
  subletDetailingCost: '',
  peStampCost: '',
  otherDirectCosts: '',
  overheadPercent: 12.0,
  steelJoistTons: '',
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
  miscCharges: '',
  miscellaneousLaborRate: 85.0,
  miscellaneousErectionMultiplier: 1.12,
  miscellaneousTaxMultiplier: 1.06,
  miscellaneousJoistDeckMultiplier: 1.12,
  miscellaneousOtherCostMultiplier: 1.12,
  miscellaneousProfitPercent: 10.0,
  miscellaneousMiscCharges: ''
};

export default function EstimationModel() {
  // --- State for Modal ---
  const [activeSection, setActiveSection] = useState(null);

  // --- Auto-open Section from Query Param ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    if (section) {
      setActiveSection(section);
      // Clean up search query param
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);


  // --- State for Saving ---
  const [isSaving, setIsSaving] = useState(false);

  // --- State for Project Info ---
  const [projectInfo, setProjectInfo] = useState(() => {
    const saved = localStorage.getItem('sfe_est_project');
    const parsed = saved ? JSON.parse(saved) : null;
    return parsed ? { projectId: '', ...parsed } : DEFAULT_PROJECT_INFO;
  });

  // --- State for Bid Enquiry Sheet (Material Section) ---
  const [bidEnquiry, setBidEnquiry] = useState(() => {
    const saved = localStorage.getItem('sfe_est_bid_enquiry');
    return saved ? JSON.parse(saved) : DEFAULT_BID_ENQUIRY;
  });

  // --- State for all other 6 Estimation Sections ---
  const [estimationSections, setEstimationSections] = useState(() => {
    const saved = localStorage.getItem('sfe_est_sections');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.numTrucks === '') parsed.numTrucks = 3;
      if (parsed.hoursPerTruck === '') parsed.hoursPerTruck = 3;
      if (parsed.galvanizingTrucks === '') parsed.galvanizingTrucks = 5;
      if (parsed.galvHoursPerTruck === '') parsed.galvHoursPerTruck = 5.0;
      return { ...DEFAULT_ESTIMATION_SECTIONS, ...parsed };
    }
    return DEFAULT_ESTIMATION_SECTIONS;
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

  const handleProjectChange = async (e) => {
    const projId = e.target.value;
    if (!projId) {
      setProjectInfo(DEFAULT_PROJECT_INFO);
      setBidEnquiry(DEFAULT_BID_ENQUIRY);
      setEstimationSections(DEFAULT_ESTIMATION_SECTIONS);
      localStorage.removeItem('sfe_est_project');
      localStorage.removeItem('sfe_est_bid_enquiry');
      localStorage.removeItem('sfe_est_sections');
      return;
    }
    
    try {
      setLoadingProjects(true);
      const res = await projectAPI.getById(projId);
      const selected = res.data;
      if (selected) {
        const nextProjectInfo = {
          ...DEFAULT_PROJECT_INFO,
          projectId: selected.id,
          project: selected.name,
          quoteNum: selected.code || '',
          salesman: selected.project_manager_name || '',
          startDate: selected.erection_date || ''
        };
        
        const estData = selected.estimation_data || {};
        if (estData.bidEnquiry && estData.estimationSections) {
          setProjectInfo({
            ...nextProjectInfo,
            ...estData.projectInfo,
            projectId: selected.id,
            project: selected.name,
            quoteNum: selected.code || '',
            salesman: selected.project_manager_name || '',
            startDate: selected.erection_date || ''
          });
          setBidEnquiry(estData.bidEnquiry);
          setEstimationSections(estData.estimationSections);
          toast.success(`Calculations loaded for ${selected.name}`);
        } else {
          setProjectInfo(nextProjectInfo);
          setBidEnquiry(DEFAULT_BID_ENQUIRY);
          setEstimationSections(DEFAULT_ESTIMATION_SECTIONS);
          toast.success(`Calculations reset for ${selected.name}`);
        }
      }
    } catch (err) {
      console.error('Failed to fetch project details:', err);
      toast.error('Failed to load project calculations');
    } finally {
      setLoadingProjects(false);
    }
  };

  // Sync latest calculations from DB on mount if project is already selected
  useEffect(() => {
    const syncProjectOnMount = async () => {
      if (projectInfo.projectId) {
        try {
          const res = await projectAPI.getById(projectInfo.projectId);
          const selected = res.data;
          if (selected && selected.estimation_data) {
            const estData = selected.estimation_data;
            if (estData.bidEnquiry && estData.estimationSections) {
              setProjectInfo(prev => ({
                ...prev,
                ...estData.projectInfo,
                projectId: selected.id,
                project: selected.name,
                quoteNum: selected.code || '',
                salesman: selected.project_manager_name || '',
                startDate: selected.erection_date || ''
              }));
              setBidEnquiry(estData.bidEnquiry);
              setEstimationSections(estData.estimationSections);
            }
          }
        } catch (err) {
          console.error('Failed to sync project calculations on mount:', err);
        }
      }
    };
    syncProjectOnMount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveToDatabase = async () => {
    if (!projectInfo.projectId) {
      toast.error('Please select a project first');
      return;
    }
    try {
      setIsSaving(true);
      const payload = {
        estimation_data: {
          projectInfo,
          bidEnquiry,
          estimationSections
        }
      };
      await projectAPI.patch(projectInfo.projectId, payload);
      toast.success('Calculations successfully saved');
    } catch (err) {
      console.error('Failed to save calculations:', err);
      toast.error('Failed to save calculations');
    } finally {
      setIsSaving(false);
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

  const formatTons = (val) => {
    if (val === 0) return '0.000';
    const str = val.toFixed(4);
    if (str.endsWith('0')) {
      return val.toFixed(3);
    }
    return str;
  };

  // ── Material Section ──
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
  const scrapAmount = (millAmountVal + warehouseAmountVal) * scrapPercentVal / 100;

  // 4. plant & Field Bolts
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
  const totalTons = millTons + warehouseTons;

  // ── Section 1: plant Labor Calculations ──
  const plantFabricationHoursVal = Number(estimationSections.plantFabricationHours) || 0;
  const miscLaborHoursVal = Number(estimationSections.miscLaborHours) || 0;
  const miscLaborOtherHoursVal = Number(estimationSections.miscLaborOtherHours) || 0;
  const miscLaborOther2HoursVal = Number(estimationSections.miscLaborOther2Hours) || 0;
  const totalPiecesVal = Number(estimationSections.totalPieces) || 0;
  const hourlyLaborRateVal = Number(estimationSections.hourlyLaborRate) || 0;
  const numTrucksVal = Number(estimationSections.numTrucks) || 0;
  const hoursPerTruckVal = Number(estimationSections.hoursPerTruck) || 0;
  const galvanizingTrucksVal = Number(estimationSections.galvanizingTrucks) || 0;
  const galvHoursPerTruckVal = Number(estimationSections.galvHoursPerTruck) || 0;
  const shippingRateVal = Number(estimationSections.shippingRate) || 0;

  const totalLaborHours = plantFabricationHoursVal + miscLaborHoursVal + miscLaborOtherHoursVal + miscLaborOther2HoursVal;
  const manHoursPerTon = totalTons > 0 ? totalLaborHours / totalTons : 0;
  const piecesPerTon = totalTons > 0 ? totalPiecesVal / totalTons : 0;
  const totalDirectplantCost = totalLaborHours * hourlyLaborRateVal;

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
  const totalDirectCosts = totalMaterialCost + totalDirectplantCost + totalShippingCost + totalDirectDraftingCost + otherDirectCostsVal;
  const directCostPerTon = totalTons > 0 ? Math.round(totalDirectCosts) / totalTons : 0;

  // ── Section 3: Profit on Direct Costs ──
  const overheadPercentVal = Number(estimationSections.overheadPercent) || 0;
  const directCostOverheadRaw = totalDirectCosts * (overheadPercentVal / 100);
  const directCostOverhead = Math.round(directCostOverheadRaw * 100) / 100;
  const bidAmountOnDirectCosts = Math.round(totalDirectCosts) + directCostOverhead;
  const bidAmountPerTon = totalTons > 0 ? bidAmountOnDirectCosts / totalTons : 0;
  const totalWeightLbs = millWeightVal + warehouseWeightVal;
  const bidAmountPerLb = totalWeightLbs > 0 ? bidAmountOnDirectCosts / totalWeightLbs : 0;

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
  const buyoutOverhead = Math.round(totalBuyoutCosts) * (buyoutOverheadPercentVal / 100);
  const bidAmountOnBuyouts = Math.round(totalBuyoutCosts) + buyoutOverhead;

  // ── Section 6: Final Totals ──
  const profitPercentVal = Number(estimationSections.profitPercent) || 0;
  const miscChargesVal = Number(estimationSections.miscCharges) || 0;

  const totalAmountBeforeProfit = Math.round(bidAmountOnDirectCosts) + Math.round(bidAmountOnBuyouts);
  const profitAmount = totalAmountBeforeProfit * (profitPercentVal / 100);
  const finalAmountBeforeMisc = totalAmountBeforeProfit + profitAmount;
  const finalBidAmount = finalAmountBeforeMisc + miscChargesVal;

  // ── miscellaneous Calculations ──
  const miscellaneousLaborRateVal = Math.max(0, Number(estimationSections.miscellaneousLaborRate) || 0);
  const miscellaneousErectionMultiplierVal = Math.max(0, Number(estimationSections.miscellaneousErectionMultiplier) || 0);
  const miscellaneousJoistDeckMultiplierVal = Math.max(0, Number(estimationSections.miscellaneousJoistDeckMultiplier) || 0);
  const miscellaneousOtherCostMultiplierVal = Math.max(0, Number(estimationSections.miscellaneousOtherCostMultiplier) || 0);

  const miscellaneousLaborCost = totalLaborHours * miscellaneousLaborRateVal;
  const miscellaneousMaterialTotal = totalMaterialDirectCosts + materialUseTaxAmount;
  const miscellaneousTruckingTotal = totalShippingCost;
  const miscellaneousDetailingEngineeringTotal = totalDirectDraftingCost;

  const miscellaneousSubTotal = miscellaneousLaborCost + miscellaneousMaterialTotal + miscellaneousTruckingTotal + miscellaneousDetailingEngineeringTotal;

  const miscellaneousErectionTotal = subletErectionCostVal * miscellaneousErectionMultiplierVal;

  const miscellaneousJoistDeckCost = steelJoistCostVal + deckCostVal;
  const taxMultiplier = 1 + useTaxPercentVal / 100;
  const miscellaneousJoistDeckTotal = (miscellaneousJoistDeckCost * taxMultiplier) * miscellaneousJoistDeckMultiplierVal;

  const miscellaneousOtherCostsSum = miscMetalCostVal + additionalSafetyCostsVal + ccipCostsVal + leedSubmissionCostVal;
  const miscellaneousOtherCostsTotal = miscellaneousOtherCostsSum * miscellaneousOtherCostMultiplierVal;

  const miscellaneousTotalBeforeProfit = miscellaneousSubTotal + miscellaneousErectionTotal + miscellaneousJoistDeckTotal + miscellaneousOtherCostsTotal;
  const miscellaneousProfitAmount = miscellaneousTotalBeforeProfit * (profitPercentVal / 100);
  const miscellaneousMiscellaneousTotal = miscChargesVal;

  const miscellaneousFinalPrice = miscellaneousTotalBeforeProfit + miscellaneousProfitAmount + miscellaneousMiscellaneousTotal;

  // Clear Form handler
  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear all fields?")) {
      setProjectInfo(DEFAULT_PROJECT_INFO);
      setBidEnquiry(DEFAULT_BID_ENQUIRY);
      setEstimationSections(DEFAULT_ESTIMATION_SECTIONS);
      localStorage.removeItem('sfe_est_project');
      localStorage.removeItem('sfe_est_bid_enquiry');
      localStorage.removeItem('sfe_est_sections');
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
                  <span className="w-16 font-bold text-slate-500 text-right">{formatTons(millTons)} Tons</span>
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
                  <span className="w-16 font-bold text-slate-500 text-right">{formatTons(warehouseTons)} Tons</span>
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
                  <span className="w-16 font-bold text-slate-500 text-right">{formatTons(scrapTons)} Tons</span>
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

            {/* 4. plant & Field Bolts */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">4</td>
              <td className="py-4 px-4 font-bold text-slate-800">plant & Field Bolts</td>
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

  const renderplantLaborSection = () => {
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
            {/* 1. plant Fabrication */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">1</td>
              <td className="py-4 px-4 font-bold text-slate-800">plant Fabrication Hours</td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={estimationSections.plantFabricationHours}
                    placeholder="0"
                    onChange={(e) => setEstimationSections({ ...estimationSections, plantFabricationHours: e.target.value })}
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
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-slate-400 font-semibold text-[10px]">OTHER:</span>
                    <input
                      type="number"
                      min="0"
                      value={estimationSections.miscLaborOther2Hours}
                      placeholder="0"
                      onChange={(e) => setEstimationSections({ ...estimationSections, miscLaborOther2Hours: e.target.value })}
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

            {/* 3. Total Direct plant Cost */}
            <tr className="hover:bg-slate-50/50 transition-colors bg-slate-50/30">
              <td className="py-4 px-4 font-bold text-slate-400">3</td>
              <td className="py-4 px-4 font-bold text-slate-800">Total Direct plant Cost</td>
              <td className="py-4 px-4">
                <span className="font-bold text-slate-500">{totalLaborHours} Total Hrs</span>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-1 font-bold text-slate-500">
                  <span>@</span>
                  <span className="px-3 py-2 border border-slate-200 rounded-xl bg-white w-20 text-right text-slate-500">
                    ${Number(estimationSections.hourlyLaborRate || 60).toFixed(0)}
                  </span>
                  <span className="ml-1">/Hr</span>
                </div>
              </td>
              <td className="py-4 px-4 text-right pr-6">
                <span className="font-bold text-slate-800">
                  =${totalDirectplantCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </td>
            </tr>

            {/* 4. Freight Out Destination */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">4</td>
              <td className="py-4 px-4 font-bold text-slate-800">Freight Out Destination</td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">{freightOutCost}</span>
                  <span className="font-bold text-slate-400">Hrs</span>
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-1.5 font-bold text-slate-505">
                  <span>(</span>
                  <input
                    type="number"
                    min="0"
                    value={estimationSections.numTrucks}
                    placeholder="0"
                    onChange={(e) => setEstimationSections({ ...estimationSections, numTrucks: e.target.value })}
                    className="w-14 px-2 py-1 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-200 focus:border-amber-500 rounded-lg outline-none font-bold text-right text-xs"
                  />
                  <span className="text-[10px] text-slate-400">Truck(s)</span>
                  <span>@</span>
                  <input
                    type="number"
                    min="0"
                    value={estimationSections.hoursPerTruck}
                    placeholder="0"
                    onChange={(e) => setEstimationSections({ ...estimationSections, hoursPerTruck: e.target.value })}
                    className="w-14 px-2 py-1 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-200 focus:border-amber-500 rounded-lg outline-none font-bold text-right text-xs"
                  />
                  <span className="text-[10px] text-slate-400">Hrs. each)</span>
                </div>
              </td>
              <td className="py-4 px-4 text-right pr-6 font-bold text-slate-650">
                ={freightOutCost} Hrs
              </td>
            </tr>

            {/* 5. Freight Galvanizing */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">5</td>
              <td className="py-4 px-4 font-bold text-slate-800">Freight Galvanizing</td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">{freightGalvanizingCost}</span>
                  <span className="font-bold text-slate-400">Hrs</span>
                </div>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-1.5 font-bold text-slate-505">
                  <span>(</span>
                  <input
                    type="number"
                    min="0"
                    value={estimationSections.galvanizingTrucks}
                    placeholder="0"
                    onChange={(e) => setEstimationSections({ ...estimationSections, galvanizingTrucks: e.target.value })}
                    className="w-14 px-2 py-1 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-200 focus:border-amber-500 rounded-lg outline-none font-bold text-right text-xs"
                  />
                  <span className="text-[10px] text-slate-400">Truck(s)</span>
                  <span>@</span>
                  <input
                    type="number"
                    min="0"
                    value={estimationSections.galvHoursPerTruck}
                    placeholder="0"
                    onChange={(e) => setEstimationSections({ ...estimationSections, galvHoursPerTruck: e.target.value })}
                    className="w-14 px-2 py-1 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-200 focus:border-amber-500 rounded-lg outline-none font-bold text-right text-xs"
                  />
                  <span className="text-[10px] text-slate-400">Hrs. each)</span>
                </div>
              </td>
              <td className="py-4 px-4 text-right pr-6 font-bold text-slate-650">
                ={freightGalvanizingCost} Hrs
              </td>
            </tr>

            {/* 6. Total Shipping Cost */}
            <tr className="hover:bg-slate-50/50 transition-colors bg-slate-50/30">
              <td className="py-4 px-4 font-bold text-slate-400">6</td>
              <td className="py-4 px-4 font-bold text-slate-800">Total Shipping Cost</td>
              <td className="py-4 px-4">
                <span className="font-bold text-slate-505">{totalShippingHours} Total Hrs</span>
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-1 font-bold text-slate-500">
                  <span>@</span>
                  <span className="px-3 py-2 border border-slate-200 rounded-xl bg-white w-20 text-right text-slate-500">
                    ${Number(estimationSections.shippingRate || 195).toFixed(0)}
                  </span>
                  <span className="ml-1">/Hr</span>
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
                ${bidAmountPerLb.toFixed(2)} /Lb
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
            {/* 21. Steel Joist and/or Deck */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">21</td>
              <td className="py-4 px-4 font-bold text-slate-800">Steel Joist and/or Deck</td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={estimationSections.steelJoistTons}
                    placeholder="0"
                    onChange={(e) => setEstimationSections({ ...estimationSections, steelJoistTons: e.target.value })}
                    className="w-24 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 rounded-xl outline-none font-bold text-right text-xs"
                  />
                  <span className="font-bold text-slate-400">Tons</span>
                </div>
              </td>
              <td className="py-4 px-4"></td>
              <td className="py-4 px-4 text-right pr-6">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="font-bold text-slate-400">=</span>
                  <span className="relative flex items-center">
                    <span className="absolute left-3 font-bold text-slate-800">$</span>
                    <input
                      type="number"
                      min="0"
                      value={estimationSections.steelJoistCost}
                      placeholder="0"
                      onChange={(e) => setEstimationSections({ ...estimationSections, steelJoistCost: e.target.value })}
                      className="w-28 pl-6 pr-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                    />
                  </span>
                </div>
              </td>
            </tr>

            {/* 23. Sublet Erection */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">23</td>
              <td className="py-4 px-4 font-bold text-slate-800">Sublet Erection</td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-1.5">
                  <span className="px-3 py-2 border border-slate-200 rounded-xl bg-white w-24 text-right font-bold text-slate-500">
                    ${subletErectionCostPerTon.toFixed(2)}
                  </span>
                  <span className="font-bold text-slate-400">/ Ton</span>
                </div>
              </td>
              <td className="py-4 px-4"></td>
              <td className="py-4 px-4 text-right pr-6">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="font-bold text-slate-400">=</span>
                  <span className="relative flex items-center">
                    <span className="absolute left-3 font-bold text-slate-800">$</span>
                    <input
                      type="number"
                      min="0"
                      value={estimationSections.subletErectionCost}
                      placeholder="0"
                      onChange={(e) => setEstimationSections({ ...estimationSections, subletErectionCost: e.target.value })}
                      className="w-28 pl-6 pr-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                    />
                  </span>
                </div>
              </td>
            </tr>

            {/* 24. Miscellaneous Metals */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">24</td>
              <td className="py-4 px-4 font-bold text-slate-800">Miscellaneous Metals</td>
              <td className="py-4 px-4"></td>
              <td className="py-4 px-4"></td>
              <td className="py-4 px-4 text-right pr-6">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="font-bold text-slate-400">=</span>
                  <span className="relative flex items-center">
                    <span className="absolute left-3 font-bold text-slate-800">$</span>
                    <input
                      type="number"
                      min="0"
                      value={estimationSections.miscMetalCost}
                      placeholder="0"
                      onChange={(e) => setEstimationSections({ ...estimationSections, miscMetalCost: e.target.value })}
                      className="w-28 pl-6 pr-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                    />
                  </span>
                </div>
              </td>
            </tr>

            {/* 25. Other */}
            <tr className="bg-slate-50/30">
              <td className="py-4 px-4 font-bold text-slate-400">25</td>
              <td className="py-4 px-4 font-bold text-slate-850" colSpan="4">Other</td>
            </tr>

            {/* OSHA Posts Lin.Ft. */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400"></td>
              <td className="py-4 px-4 pl-8 font-semibold text-slate-700">OSHA Posts Lin.Ft.</td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={estimationSections.oshaLinearFeet}
                    placeholder="0"
                    onChange={(e) => setEstimationSections({ ...estimationSections, oshaLinearFeet: e.target.value })}
                    className="w-24 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 rounded-xl outline-none font-bold text-right text-xs"
                  />
                  <span className="font-bold text-slate-400">LF</span>
                </div>
              </td>
              <td className="py-4 px-4"></td>
              <td className="py-4 px-4 text-right pr-6">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="font-bold text-slate-400">=</span>
                  <span className="px-3 py-2 border border-amber-300 rounded-xl bg-[#fef9c3] w-28 text-right font-bold text-slate-900">
                    ${oshaPostsCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              </td>
            </tr>

            {/* SAFETY Additional Safety Costs/CCIP */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400"></td>
              <td className="py-4 px-4 pl-8 font-semibold text-slate-700">SAFETY Additional Safety Costs/CCIP</td>
              <td className="py-4 px-4"></td>
              <td className="py-4 px-4"></td>
              <td className="py-4 px-4 text-right pr-6">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="font-bold text-slate-400">=</span>
                  <span className="relative flex items-center">
                    <span className="absolute left-3 font-bold text-slate-800">$</span>
                    <input
                      type="number"
                      min="0"
                      value={estimationSections.additionalSafetyCosts}
                      placeholder="0"
                      onChange={(e) => setEstimationSections({ ...estimationSections, additionalSafetyCosts: e.target.value })}
                      className="w-28 pl-6 pr-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                    />
                  </span>
                </div>
              </td>
            </tr>

            {/* LEED Data Submittal */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400"></td>
              <td className="py-4 px-4 pl-8 font-semibold text-slate-700">LEED LEED Data Submittal</td>
              <td className="py-4 px-4"></td>
              <td className="py-4 px-4"></td>
              <td className="py-4 px-4 text-right pr-6">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="font-bold text-slate-400">=</span>
                  <span className="relative flex items-center">
                    <span className="absolute left-3 font-bold text-slate-800">$</span>
                    <input
                      type="number"
                      min="0"
                      value={estimationSections.leedSubmissionCost}
                      placeholder="0"
                      onChange={(e) => setEstimationSections({ ...estimationSections, leedSubmissionCost: e.target.value })}
                      className="w-28 pl-6 pr-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                    />
                  </span>
                </div>
              </td>
            </tr>

            {/* 26. Total Direct Buyout Costs */}
            <tr className="bg-slate-50/50 border-t-2 border-slate-200">
              <td className="py-4 px-4 font-bold text-slate-400">26</td>
              <td className="py-4 px-4 font-bold text-slate-800" colSpan="3">Total Direct Buyout Costs</td>
              <td className="py-4 px-4 text-right pr-6">
                <div className="flex items-center justify-end gap-1.5 font-bold text-slate-900">
                  <span>=</span>
                  <span className="px-3 py-2 border-2 border-slate-300 rounded-xl bg-white w-28 text-right shadow-sm">
                    ${totalDirectBuyoutCosts.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              </td>
            </tr>

            {/* 27. Use Tax */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="py-4 px-4 font-bold text-slate-400">27</td>
              <td className="py-4 px-4 font-bold text-slate-800">Use Tax 6% x Cost of Supplied Material</td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
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
              </td>
              <td className="py-4 px-4"></td>
              <td className="py-4 px-4 text-right pr-6">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="font-bold text-slate-400">=</span>
                  <span className="px-3 py-2 border border-amber-300 rounded-xl bg-[#fef9c3] w-28 text-right font-bold text-slate-900">
                    ${useTax.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
              </td>
            </tr>

            {/* 29. Total Buyout Costs */}
            <tr className="hover:bg-slate-50/50 transition-colors bg-slate-50 border-t-2 border-slate-200">
              <td className="py-4 px-4 font-bold text-slate-400">29</td>
              <td className="py-4 px-4 font-black text-slate-900 text-sm" colSpan="3">Total Buyout Costs</td>
              <td className="py-4 px-4 text-right pr-6 font-black text-slate-900 text-sm">
                <div className="flex items-center justify-end gap-1.5">
                  <span>=</span>
                  <span className="px-3 py-2 border-2 border-slate-350 rounded-xl bg-white w-28 text-right shadow-md">
                    ${totalBuyoutCosts.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
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

  const rendermiscellaneousSection = () => {
    const miscellaneousFinalPricePerTon = totalTons > 0 ? miscellaneousFinalPrice / totalTons : 0;
    return (
      <div className="space-y-6">
        <div className="overflow-x-auto border border-slate-200 rounded-[1.5rem]">
          <table className="w-full text-left border-collapse min-w-[500px] text-xs">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                <th className="py-4 px-6 w-[350px]">miscellaneous Final Category</th>
                <th className="py-4 px-6 w-[250px]">Factor / Input</th>
                <th className="py-4 px-6 text-right pr-8 w-[250px]">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {/* Row 66: Labor Hour X */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-6 font-bold text-slate-800">Labor Hour X</td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-400">$</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={estimationSections.miscellaneousLaborRate}
                      onChange={(e) => setEstimationSections({ ...estimationSections, miscellaneousLaborRate: e.target.value })}
                      className="w-24 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                    />
                    <span className="font-bold text-slate-500">/Hr</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-right pr-8 font-bold text-slate-800 text-sm">
                  ${miscellaneousLaborCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Row 67: Material */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-6 font-bold text-slate-800">Material</td>
                <td className="py-4 px-6"></td>
                <td className="py-4 px-6 text-right pr-8 font-bold text-slate-800 text-sm">
                  ${miscellaneousMaterialTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Row 68: Trucking */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-6 font-bold text-slate-800">Trucking</td>
                <td className="py-4 px-6"></td>
                <td className="py-4 px-6 text-right pr-8 font-bold text-slate-800 text-sm">
                  ${miscellaneousTruckingTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Row 69: Det/Eng */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-6 font-bold text-slate-800">Det/Eng</td>
                <td className="py-4 px-6"></td>
                <td className="py-4 px-6 text-right pr-8 font-bold text-slate-800 text-sm">
                  ${miscellaneousDetailingEngineeringTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Row 70: Sub-total */}
              <tr className="hover:bg-slate-50/50 transition-colors bg-slate-50/50">
                <td className="py-4 px-6 font-bold text-slate-800">Sub-total</td>
                <td className="py-4 px-6"></td>
                <td className="py-4 px-6 text-right pr-8 font-bold text-slate-800 text-sm">
                  ${miscellaneousSubTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Row 71: Erection X 1.?? */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-6 font-bold text-slate-800">Erection X 1.??</td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={estimationSections.miscellaneousErectionMultiplier}
                      onChange={(e) => setEstimationSections({ ...estimationSections, miscellaneousErectionMultiplier: e.target.value })}
                      className="w-24 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                    />
                  </div>
                </td>
                <td className="py-4 px-6 text-right pr-8 font-bold text-slate-800 text-sm">
                  ${miscellaneousErectionTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Row 72: J&D x 1.?? + Tax */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-6 font-bold text-slate-800">J&D x 1.?? + Tax</td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={estimationSections.miscellaneousJoistDeckMultiplier}
                      onChange={(e) => setEstimationSections({ ...estimationSections, miscellaneousJoistDeckMultiplier: e.target.value })}
                      className="w-24 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                    />
                  </div>
                </td>
                <td className="py-4 px-6 text-right pr-8 font-bold text-slate-800 text-sm">
                  ${miscellaneousJoistDeckTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Row 73: Other x 1.?? + Tax?? */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-6 font-bold text-slate-800">Other x 1.?? + Tax??</td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={estimationSections.miscellaneousOtherCostMultiplier}
                      onChange={(e) => setEstimationSections({ ...estimationSections, miscellaneousOtherCostMultiplier: e.target.value })}
                      className="w-24 px-3 py-2 bg-[#fef9c3] hover:bg-[#fef08a] focus:bg-white text-slate-900 border border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 rounded-xl outline-none font-bold text-right transition-all"
                    />
                  </div>
                </td>
                <td className="py-4 px-6 text-right pr-8 font-bold text-slate-800 text-sm">
                  ${miscellaneousOtherCostsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Row 74: Total */}
              <tr className="hover:bg-slate-50/50 transition-colors bg-slate-50/50">
                <td className="py-4 px-6 font-bold text-slate-800">Total</td>
                <td className="py-4 px-6"></td>
                <td className="py-4 px-6 text-right pr-8 font-bold text-slate-800 text-sm">
                  ${miscellaneousTotalBeforeProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Row 75: Profit x 1.?? */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-6 font-bold text-slate-800">Profit x 1.??</td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-2 bg-white text-slate-500 border border-slate-200 rounded-xl font-bold text-right select-none w-24">
                      {profitPercentVal}%
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6 text-right pr-8 font-bold text-slate-800 text-sm">
                  <div className="flex flex-col items-end">
                    <span>${miscellaneousProfitAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span className="text-[10px] text-slate-400 font-normal">Struct With Profit</span>
                  </div>
                </td>
              </tr>

              {/* Row 76: Misc. */}
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-6 font-bold text-slate-800">Misc.</td>
                <td className="py-4 px-6"></td>
                <td className="py-4 px-6 text-right pr-8 font-bold text-slate-800 text-sm">
                  ${miscellaneousMiscellaneousTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              {/* Row 77: Final Price */}
              <tr className="hover:bg-slate-50/50 transition-colors bg-amber-50/10">
                <td className="py-4 px-6 font-extrabold text-amber-600 text-sm">Final Price</td>
                <td className="py-4 px-6"></td>
                <td className="py-4 px-6 text-right pr-8 font-extrabold text-amber-600 text-sm">
                  ${miscellaneousFinalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* miscellaneous Prominent Display */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-[1.5rem] p-6 text-white flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg border border-amber-500/30">
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-amber-100">miscellaneous FINAL SUMMARY PRICE</h4>
            <p className="text-xs text-amber-50 mt-1">This is the final calculated price for the miscellaneous summary section.</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black">
              ${miscellaneousFinalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {totalTons > 0 && (
              <span className="text-xs font-bold text-amber-100">
                (${miscellaneousFinalPricePerTon.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/Ton)
              </span>
            )}
          </div>
        </div>
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
          {projectInfo.projectId && (
            <button
              onClick={handleSaveToDatabase}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-amber-500/20"
              title="Save calculations"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          )}
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
            <h4 className="text-xl font-extrabold text-slate-800 mt-1">{formatTons(totalTons)} Tons</h4>
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
                className={`w-full flex items-center justify-between p-4 border rounded-2xl font-bold text-sm transition-all shadow-sm group hover:scale-[1.01] ${activeSection === 'material' ? 'bg-amber-500 border-amber-600 text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}`}
              >
                <div className="flex items-center gap-3">
                  <Calculator className={`w-5 h-5 ${activeSection === 'material' ? 'text-white' : 'text-slate-500'}`} />
                  <span>Material Section</span>
                </div>
                <span className={`${activeSection === 'material' ? 'text-white' : 'text-slate-400'} group-hover:translate-x-1 transition-transform`}>→</span>
              </button>

              {/* Button 2: plant Labor */}
              <button
                onClick={() => setActiveSection('plantLabor')}
                className={`w-full flex items-center justify-between p-4 border rounded-2xl font-bold text-sm transition-all shadow-sm group hover:scale-[1.01] ${activeSection === 'plantLabor' ? 'bg-amber-500 border-amber-600 text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}`}
              >
                <div className="flex items-center gap-3">
                  <Calculator className={`w-5 h-5 ${activeSection === 'plantLabor' ? 'text-white' : 'text-slate-500'}`} />
                  <span>plant Labor</span>
                </div>
                <span className={`${activeSection === 'plantLabor' ? 'text-white' : 'text-slate-400'} group-hover:translate-x-1 transition-transform`}>→</span>
              </button>

              {/* Button 3: Drafting */}
              <button
                onClick={() => setActiveSection('drafting')}
                className={`w-full flex items-center justify-between p-4 border rounded-2xl font-bold text-sm transition-all shadow-sm group hover:scale-[1.01] ${activeSection === 'drafting' ? 'bg-amber-500 border-amber-600 text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}`}
              >
                <div className="flex items-center gap-3">
                  <Calculator className={`w-5 h-5 ${activeSection === 'drafting' ? 'text-white' : 'text-slate-500'}`} />
                  <span>Drafting Section</span>
                </div>
                <span className={`${activeSection === 'drafting' ? 'text-white' : 'text-slate-400'} group-hover:translate-x-1 transition-transform`}>→</span>
              </button>

              {/* Button 4: Profit on Direct Costs */}
              <button
                onClick={() => setActiveSection('profitDirect')}
                className={`w-full flex items-center justify-between p-4 border rounded-2xl font-bold text-sm transition-all shadow-sm group hover:scale-[1.01] ${activeSection === 'profitDirect' ? 'bg-amber-500 border-amber-600 text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}`}
              >
                <div className="flex items-center gap-3">
                  <Calculator className={`w-5 h-5 ${activeSection === 'profitDirect' ? 'text-white' : 'text-slate-500'}`} />
                  <span>Profit on Direct Costs</span>
                </div>
                <span className={`${activeSection === 'profitDirect' ? 'text-white' : 'text-slate-400'} group-hover:translate-x-1 transition-transform`}>→</span>
              </button>

              {/* Button 5: Buyouts */}
              <button
                onClick={() => setActiveSection('buyouts')}
                className={`w-full flex items-center justify-between p-4 border rounded-2xl font-bold text-sm transition-all shadow-sm group hover:scale-[1.01] ${activeSection === 'buyouts' ? 'bg-amber-500 border-amber-600 text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}`}
              >
                <div className="flex items-center gap-3">
                  <Calculator className={`w-5 h-5 ${activeSection === 'buyouts' ? 'text-white' : 'text-slate-500'}`} />
                  <span>Buyouts Section</span>
                </div>
                <span className={`${activeSection === 'buyouts' ? 'text-white' : 'text-slate-400'} group-hover:translate-x-1 transition-transform`}>→</span>
              </button>

              {/* Button 6: Profit on Buyouts */}
              <button
                onClick={() => setActiveSection('profitBuyouts')}
                className={`w-full flex items-center justify-between p-4 border rounded-2xl font-bold text-sm transition-all shadow-sm group hover:scale-[1.01] ${activeSection === 'profitBuyouts' ? 'bg-amber-500 border-amber-600 text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}`}
              >
                <div className="flex items-center gap-3">
                  <Calculator className={`w-5 h-5 ${activeSection === 'profitBuyouts' ? 'text-white' : 'text-slate-500'}`} />
                  <span>Profit on Buyouts</span>
                </div>
                <span className={`${activeSection === 'profitBuyouts' ? 'text-white' : 'text-slate-400'} group-hover:translate-x-1 transition-transform`}>→</span>
              </button>

              {/* Button 7: Final Totals */}
              <button
                onClick={() => setActiveSection('finalTotals')}
                className={`w-full flex items-center justify-between p-4 border rounded-2xl font-bold text-sm transition-all shadow-sm group hover:scale-[1.01] ${activeSection === 'finalTotals' ? 'bg-amber-500 border-amber-600 text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}`}
              >
                <div className="flex items-center gap-3">
                  <Calculator className={`w-5 h-5 ${activeSection === 'finalTotals' ? 'text-white' : 'text-slate-500'}`} />
                  <span>Final Totals</span>
                </div>
                <span className={`${activeSection === 'finalTotals' ? 'text-white' : 'text-slate-400'} group-hover:translate-x-1 transition-transform`}>→</span>
              </button>

              {/* Button 8: miscellaneous */}
              <button
                onClick={() => setActiveSection('miscellaneous')}
                className={`w-full flex items-center justify-between p-4 border rounded-2xl font-bold text-sm transition-all shadow-sm group hover:scale-[1.01] ${activeSection === 'miscellaneous' ? 'bg-amber-500 border-amber-600 text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}`}
              >
                <div className="flex items-center gap-3">
                  <Calculator className={`w-5 h-5 ${activeSection === 'miscellaneous' ? 'text-white' : 'text-slate-500'}`} />
                  <span>miscellaneous</span>
                </div>
                <span className={`${activeSection === 'miscellaneous' ? 'text-white' : 'text-slate-400'} group-hover:translate-x-1 transition-transform`}>→</span>
              </button>

              {/* Button 9: Summary */}
              <button
                onClick={() => setActiveSection('summary')}
                className={`w-full flex items-center justify-between p-4 border rounded-2xl font-bold text-sm transition-all shadow-sm group hover:scale-[1.01] ${activeSection === 'summary' ? 'bg-amber-500 border-amber-600 text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}`}
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className={`w-5 h-5 ${activeSection === 'summary' ? 'text-white' : 'text-slate-500'}`} />
                  <span>Estimation Summary</span>
                </div>
                <span className={`${activeSection === 'summary' ? 'text-white' : 'text-slate-400'} group-hover:translate-x-1 transition-transform`}>→</span>
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
                    {activeSection === 'plantLabor' && 'plant Labor Section'}
                    {activeSection === 'drafting' && 'Drafting & Direct Costs'}
                    {activeSection === 'profitDirect' && 'Profit on Direct Costs'}
                    {activeSection === 'buyouts' && 'Buyouts Section'}
                    {activeSection === 'profitBuyouts' && 'Profit on Buyouts'}
                    {activeSection === 'finalTotals' && 'Final Totals Section'}
                    {activeSection === 'miscellaneous' && 'miscellaneous Section'}
                    {activeSection === 'summary' && 'Estimation Summary'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {activeSection === 'material' && 'Perform calculations for mill, warehouse, and scrap materials.'}
                    {activeSection === 'plantLabor' && 'Perform calculations for plant fabrication hours and shipping costs.'}
                    {activeSection === 'drafting' && 'Perform calculations for sublet detailing, PE stamps, and total direct costs.'}
                    {activeSection === 'profitDirect' && 'Apply overhead percentage to total direct costs.'}
                    {activeSection === 'buyouts' && 'Calculate buyout material and erection expenses.'}
                    {activeSection === 'profitBuyouts' && 'Apply overhead percentage to buyout costs.'}
                    {activeSection === 'finalTotals' && 'Review totals, apply profit percentage, and calculate final bid amount.'}
                    {activeSection === 'miscellaneous' && 'Review Row 66-77 Final Summary, apply multipliers, tax, and profit percentages to calculate miscellaneous final price.'}
                    {activeSection === 'summary' && 'Review the visual summary and KPI analysis of all bid sections.'}
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
              {activeSection !== 'summary' && (
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
              )}

              {/* Render dynamic section */}
              {activeSection === 'material' && renderMaterialSection()}
              {activeSection === 'plantLabor' && renderplantLaborSection()}
              {activeSection === 'drafting' && renderDraftingSection()}
              {activeSection === 'profitDirect' && renderProfitDirectSection()}
              {activeSection === 'buyouts' && renderBuyoutsSection()}
              {activeSection === 'profitBuyouts' && renderProfitBuyoutsSection()}
              {activeSection === 'finalTotals' && renderFinalTotalsSection()}
              {activeSection === 'miscellaneous' && rendermiscellaneousSection()}
              {activeSection === 'summary' && (
                <EstimationSummary isEmbedded={true} onEditSection={setActiveSection} />
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end gap-3 font-semibold text-xs">
              <button
                onClick={() => setActiveSection(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs transition-colors shadow-sm"
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
