import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calculator,
  ArrowLeftRight,
  TrendingUp,
  Box,
  Layers,
  Users,
  FileSpreadsheet,
  Settings,
  ArrowUpRight,
  Sparkles,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  AlertCircle,
  Pen
} from 'lucide-react';
import { projectAPI, rfqAPI } from '../services/api';

export default function EstimationSummary({ isEmbedded = false, onEditSection }) {
  const navigate = useNavigate();

  // ───────────────────────────────────────────────────────────────────────────
  // EMBEDDED SINGLE-PROJECT SUMMARY VIEW (Existing Logic)
  // ───────────────────────────────────────────────────────────────────────────
  
  // --- Load localStorage values ---
  const activeProjectInfo = JSON.parse(localStorage.getItem('sfe_est_project') || '{}');
  const activeBidEnquiry = JSON.parse(localStorage.getItem('sfe_est_bid_enquiry') || '{}');
  const activeEstimationSections = JSON.parse(localStorage.getItem('sfe_est_sections') || '{}');

  // --- Calculations for Single Project ---
  const activeMillWeightVal = Number(activeBidEnquiry.millWeight) || 0;
  const activeMillAmountVal = Number(activeBidEnquiry.millAmount) || 0;
  const activeMillTons = activeMillWeightVal / 2000;

  const activeWarehouseWeightVal = Number(activeBidEnquiry.warehouseWeight) || 0;
  const activeWarehouseAmountVal = Number(activeBidEnquiry.warehouseAmount) || 0;
  const activeWarehouseTons = activeWarehouseWeightVal / 2000;

  const activeTotalTons = activeMillTons + activeWarehouseTons;

  const activeScrapPercentVal = Number(activeBidEnquiry.scrapPercent) !== undefined && activeBidEnquiry.scrapPercent !== '' ? Number(activeBidEnquiry.scrapPercent) : 5.0;
  const activeScrapAmount = (activeMillAmountVal + activeWarehouseAmountVal) * activeScrapPercentVal / 100;

  const activeBoltQtyVal = Number(activeBidEnquiry.boltQty) || 0;
  const activeBoltRateVal = Number(activeBidEnquiry.boltRate) !== undefined && activeBidEnquiry.boltRate !== '' ? Number(activeBidEnquiry.boltRate) : 1.75;
  const activeBoltAmount = activeBoltQtyVal * activeBoltRateVal;

  const activePaintQtyVal = Number(activeBidEnquiry.paintQty) || 0;
  const activePaintRateVal = Number(activeBidEnquiry.paintRate) !== undefined && activeBidEnquiry.paintRate !== '' ? Number(activeBidEnquiry.paintRate) : 22.20;
  const activePaintAmount = activePaintQtyVal * activePaintRateVal;

  const activeGalvanizingWeightVal = Number(activeBidEnquiry.galvanizingWeight) || 0;
  const activeGalvanizingRateVal = Number(activeBidEnquiry.galvanizingRate) !== undefined && activeBidEnquiry.galvanizingRate !== '' ? Number(activeBidEnquiry.galvanizingRate) : 0.40;
  const activeAdjustedGalvanizedWeight = activeGalvanizingWeightVal * 1.05;
  const activeGalvanizingAmount = activeAdjustedGalvanizedWeight * activeGalvanizingRateVal;

  const activeMiscSubtotal = Array.isArray(activeBidEnquiry.miscItems) 
    ? activeBidEnquiry.miscItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    : 0;

  const activeTotalMaterialDirectCosts = activeMillAmountVal + activeWarehouseAmountVal + activeScrapAmount + activeBoltAmount + activePaintAmount + activeGalvanizingAmount + activeMiscSubtotal;
  const activeTaxPercentVal = Number(activeBidEnquiry.taxPercent) !== undefined && activeBidEnquiry.taxPercent !== '' ? Number(activeBidEnquiry.taxPercent) : 6.0;
  const activeMaterialUseTaxAmount = activeTotalMaterialDirectCosts * (activeTaxPercentVal / 100);
  const activeTotalMaterialCost = activeTotalMaterialDirectCosts + activeMaterialUseTaxAmount;

  const activePlantFabricationHoursVal = Number(activeEstimationSections.plantFabricationHours) || 0;
  const activeMiscLaborHoursVal = Number(activeEstimationSections.miscLaborHours) || 0;
  const activeMiscLaborOtherHoursVal = Number(activeEstimationSections.miscLaborOtherHours) || 0;
  const activeMiscLaborOther2HoursVal = Number(activeEstimationSections.miscLaborOther2Hours) || 0;
  const activeTotalLaborHours = activePlantFabricationHoursVal + activeMiscLaborHoursVal + activeMiscLaborOtherHoursVal + activeMiscLaborOther2HoursVal;
  const activeHourlyLaborRateVal = Number(activeEstimationSections.hourlyLaborRate) !== undefined && activeEstimationSections.hourlyLaborRate !== '' ? Number(activeEstimationSections.hourlyLaborRate) : 60.0;
  const activeTotalDirectplantCost = activeTotalLaborHours * activeHourlyLaborRateVal;

  const activeNumTrucksVal = Number(activeEstimationSections.numTrucks) !== undefined && activeEstimationSections.numTrucks !== '' ? Number(activeEstimationSections.numTrucks) : 3;
  const activeHoursPerTruckVal = Number(activeEstimationSections.hoursPerTruck) !== undefined && activeEstimationSections.hoursPerTruck !== '' ? Number(activeEstimationSections.hoursPerTruck) : 3;
  const activeGalvanizingTrucksVal = Number(activeEstimationSections.galvanizingTrucks) !== undefined && activeEstimationSections.galvanizingTrucks !== '' ? Number(activeEstimationSections.galvanizingTrucks) : 5;
  const activeGalvHoursPerTruckVal = Number(activeEstimationSections.galvHoursPerTruck) !== undefined && activeEstimationSections.galvHoursPerTruck !== '' ? Number(activeEstimationSections.galvHoursPerTruck) : 5.0;
  const activeShippingRateVal = Number(activeEstimationSections.shippingRate) !== undefined && activeEstimationSections.shippingRate !== '' ? Number(activeEstimationSections.shippingRate) : 195.0;

  const activeFreightOutCost = activeNumTrucksVal * activeHoursPerTruckVal;
  const activeFreightGalvanizingCost = activeGalvanizingTrucksVal * activeGalvHoursPerTruckVal;
  const activeTotalShippingHours = activeFreightOutCost + activeFreightGalvanizingCost;
  const activeTotalShippingCost = activeTotalShippingHours * activeShippingRateVal;

  const activeSubletDetailingCostVal = Number(activeEstimationSections.subletDetailingCost) || 0;
  const activePeStampCostVal = Number(activeEstimationSections.peStampCost) || 0;
  const activeOtherDirectCostsVal = Number(activeEstimationSections.otherDirectCosts) || 0;
  const activeTotalDirectDraftingCost = activeSubletDetailingCostVal + activePeStampCostVal;

  const activeTotalDirectCosts = activeTotalMaterialCost + activeTotalDirectplantCost + activeTotalShippingCost + activeTotalDirectDraftingCost + activeOtherDirectCostsVal;

  const activeOverheadPercentVal = Number(activeEstimationSections.overheadPercent) !== undefined && activeEstimationSections.overheadPercent !== '' ? Number(activeEstimationSections.overheadPercent) : 12.0;
  const activeDirectCostOverhead = Math.round(activeTotalDirectCosts * (activeOverheadPercentVal / 100) * 100) / 100;
  const activeBidAmountOnDirectCosts = Math.round(activeTotalDirectCosts) + activeDirectCostOverhead;

  const activeSteelJoistCostVal = Number(activeEstimationSections.steelJoistCost) || 0;
  const activeDeckCostVal = Number(activeEstimationSections.deckCost) || 0;
  const activeSubletErectionCostVal = Number(activeEstimationSections.subletErectionCost) || 0;
  const activeMiscMetalCostVal = Number(activeEstimationSections.miscMetalCost) || 0;
  const activeOshaLinearFeetVal = Number(activeEstimationSections.oshaLinearFeet) || 0;
  const activeOshaPostsCost = (activeOshaLinearFeetVal / 5) * 50;
  const activeAdditionalSafetyCostsVal = Number(activeEstimationSections.additionalSafetyCosts) || 0;
  const activeCcipCostsVal = Number(activeEstimationSections.ccipCosts) || 0;
  const activeSafetyCost = activeAdditionalSafetyCostsVal + activeCcipCostsVal;
  const activeLeedSubmissionCostVal = Number(activeEstimationSections.leedSubmissionCost) || 0;
  const activeSuppliedMaterialCostVal = Number(activeEstimationSections.suppliedMaterialCost) || 0;
  const activeUseTaxPercentVal = Number(activeEstimationSections.useTaxPercent) !== undefined && activeEstimationSections.useTaxPercent !== '' ? Number(activeEstimationSections.useTaxPercent) : 6.0;

  const activeTotalDirectBuyoutCosts = activeSteelJoistCostVal + activeDeckCostVal + activeSubletErectionCostVal + activeMiscMetalCostVal + activeOshaPostsCost + activeSafetyCost + activeLeedSubmissionCostVal;
  const activeUseTax = activeSuppliedMaterialCostVal * (activeUseTaxPercentVal / 100);
  const activeTotalBuyoutCosts = activeTotalDirectBuyoutCosts + activeUseTax;

  const activeBuyoutOverheadPercentVal = Number(activeEstimationSections.buyoutOverheadPercent) !== undefined && activeEstimationSections.buyoutOverheadPercent !== '' ? Number(activeEstimationSections.buyoutOverheadPercent) : 12.0;
  const activeBuyoutOverhead = Math.round(activeTotalBuyoutCosts) * (activeBuyoutOverheadPercentVal / 100);
  const activeBidAmountOnBuyouts = Math.round(activeTotalBuyoutCosts) + activeBuyoutOverhead;

  const activeProfitPercentVal = Number(activeEstimationSections.profitPercent) !== undefined && activeEstimationSections.profitPercent !== '' ? Number(activeEstimationSections.profitPercent) : 10.0;
  const activeMiscChargesVal = Number(activeEstimationSections.miscCharges) || 0;

  const activeTotalAmountBeforeProfit = Math.round(activeBidAmountOnDirectCosts) + Math.round(activeBidAmountOnBuyouts);
  const activeProfitAmount = activeTotalAmountBeforeProfit * (activeProfitPercentVal / 100);
  const activeFinalAmountBeforeMisc = activeTotalAmountBeforeProfit + activeProfitAmount;
  const activeFinalBidAmount = activeFinalAmountBeforeMisc + activeMiscChargesVal;

  // --- active miscellaneous Calculations ---
  const activeMiscellaneousLaborRateVal = Number(activeEstimationSections.miscellaneousLaborRate) !== undefined && activeEstimationSections.miscellaneousLaborRate !== '' ? Number(activeEstimationSections.miscellaneousLaborRate) : 85.0;
  const activeMiscellaneousErectionMultiplierVal = Number(activeEstimationSections.miscellaneousErectionMultiplier) !== undefined && activeEstimationSections.miscellaneousErectionMultiplier !== '' ? Number(activeEstimationSections.miscellaneousErectionMultiplier) : 1.12;
  const activeMiscellaneousJoistDeckMultiplierVal = Number(activeEstimationSections.miscellaneousJoistDeckMultiplier) !== undefined && activeEstimationSections.miscellaneousJoistDeckMultiplier !== '' ? Number(activeEstimationSections.miscellaneousJoistDeckMultiplier) : 1.12;
  const activeMiscellaneousOtherCostMultiplierVal = Number(activeEstimationSections.miscellaneousOtherCostMultiplier) !== undefined && activeEstimationSections.miscellaneousOtherCostMultiplier !== '' ? Number(activeEstimationSections.miscellaneousOtherCostMultiplier) : 1.12;

  const activeMiscellaneousLaborCost = activeTotalLaborHours * activeMiscellaneousLaborRateVal;
  const activeMiscellaneousMaterialTotal = activeTotalMaterialCost;
  const activeMiscellaneousTruckingTotal = activeTotalShippingCost;
  const activeMiscellaneousDetailingEngineeringTotal = activeTotalDirectDraftingCost;
  const activeMiscellaneousSubTotal = activeMiscellaneousLaborCost + activeMiscellaneousMaterialTotal + activeMiscellaneousTruckingTotal + activeMiscellaneousDetailingEngineeringTotal;

  const activeMiscellaneousErectionTotal = activeSubletErectionCostVal * activeMiscellaneousErectionMultiplierVal;

  const activeMiscellaneousJoistDeckCost = activeSteelJoistCostVal + activeDeckCostVal;
  const activeTaxMultiplier = 1 + activeUseTaxPercentVal / 100;
  const activeMiscellaneousJoistDeckTotal = (activeMiscellaneousJoistDeckCost * activeTaxMultiplier) * activeMiscellaneousJoistDeckMultiplierVal;

  const activeMiscellaneousOtherCostsSum = activeMiscMetalCostVal + activeSafetyCost + activeLeedSubmissionCostVal;
  const activeMiscellaneousOtherCostsTotal = activeMiscellaneousOtherCostsSum * activeMiscellaneousOtherCostMultiplierVal;

  const activeMiscellaneousTotalBeforeProfit = activeMiscellaneousSubTotal + activeMiscellaneousErectionTotal + activeMiscellaneousJoistDeckTotal + activeMiscellaneousOtherCostsTotal;
  const activeMiscellaneousProfitAmount = activeMiscellaneousTotalBeforeProfit * (activeProfitPercentVal / 100);
  const activeMiscellaneousMiscellaneousTotal = activeMiscChargesVal;
  const activeMiscellaneousFinalPrice = activeMiscellaneousTotalBeforeProfit + activeMiscellaneousProfitAmount + activeMiscellaneousMiscellaneousTotal;

  const handleEditSection = (sectionKey) => {
    if (isEmbedded && onEditSection) {
      onEditSection(sectionKey);
    } else {
      navigate(`/estimation?section=${sectionKey}`);
    }
  };

  const activeHasTons = activeTotalTons > 0;

  // ───────────────────────────────────────────────────────────────────────────
  // ALL-PROJECTS REPORT TABLE VIEW (Standalone Module)
  // ───────────────────────────────────────────────────────────────────────────
  const [projects, setProjects] = useState([]);
  const [wonRfqs, setWonRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (isEmbedded) return; // Skip loading if embedded in modal

    const fetchAllData = async () => {
      try {
        setLoading(true);
        setError('');
        const [projRes, rfqRes] = await Promise.all([
          projectAPI.getAll({ won_rfq: 'true' }),
          rfqAPI.getAll({ won_lost: 'Won' })
        ]);

        const projData = projRes.data.results || projRes.data;
        const rfqData = rfqRes.data.results || rfqRes.data;

        if (Array.isArray(projData)) setProjects(projData);
        if (Array.isArray(rfqData)) {
          // Sort RFQs descending by job number
          const sorted = [...rfqData].sort((a, b) => (b.sfe_job_no || 0) - (a.sfe_job_no || 0));
          setWonRfqs(sorted);
        }
      } catch (err) {
        console.error('Failed to fetch estimation summary data:', err);
        setError('Failed to load projects. Please verify backend service connectivity.');
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [isEmbedded]);

  // Helper to compute all 9 required estimation totals for a given project record
  const calculateEstimationValues = (project) => {
    if (!project || !project.estimation_data || Object.keys(project.estimation_data).length === 0) {
      return {
        finalBidAmount: 0,
        miscellaneousFinalPrice: 0,
        totalMaterialCost: 0,
        plantLaborAndShip: 0,
        draftingAndDirects: 0,
        directCostOverhead: 0,
        totalBuyoutCosts: 0,
        buyoutOverhead: 0,
        profitAndMisc: 0
      };
    }

    const estData = project.estimation_data || {};
    const bidEnquiry = estData.bidEnquiry || {};
    const estimationSections = estData.estimationSections || {};

    const getNum = (val, fallback = 0) => {
      if (val === undefined || val === null || val === '') return fallback;
      const num = Number(val);
      return isNaN(num) ? fallback : num;
    };

    // 1. Material Section Calculations
    const millWeight = getNum(bidEnquiry.millWeight);
    const millAmount = getNum(bidEnquiry.millAmount);
    const warehouseWeight = getNum(bidEnquiry.warehouseWeight);
    const warehouseAmount = getNum(bidEnquiry.warehouseAmount);
    
    const scrapPercent = getNum(bidEnquiry.scrapPercent, 5.0);
    const scrapAmount = (millAmount + warehouseAmount) * scrapPercent / 100;

    const boltQty = getNum(bidEnquiry.boltQty);
    const boltRate = getNum(bidEnquiry.boltRate, 1.75);
    const boltAmount = boltQty * boltRate;

    const paintQty = getNum(bidEnquiry.paintQty);
    const paintRate = getNum(bidEnquiry.paintRate, 22.20);
    const paintAmount = paintQty * paintRate;

    const galvanizingWeight = getNum(bidEnquiry.galvanizingWeight);
    const galvanizingRate = getNum(bidEnquiry.galvanizingRate, 0.40);
    const galvanizingAmount = (galvanizingWeight * 1.05) * galvanizingRate;

    const miscSubtotal = Array.isArray(bidEnquiry.miscItems) 
      ? bidEnquiry.miscItems.reduce((sum, item) => sum + getNum(item.amount), 0)
      : 0;

    const totalMaterialDirectCosts = millAmount + warehouseAmount + scrapAmount + boltAmount + paintAmount + galvanizingAmount + miscSubtotal;
    const taxPercent = getNum(bidEnquiry.taxPercent, 6.0);
    const materialUseTaxAmount = totalMaterialDirectCosts * (taxPercent / 100);
    const totalMaterialCost = totalMaterialDirectCosts + materialUseTaxAmount;

    // 2. plant Labor & Shipping Calculations
    const plantFabricationHours = getNum(estimationSections.plantFabricationHours);
    const miscLaborHours = getNum(estimationSections.miscLaborHours);
    const miscLaborOtherHours = getNum(estimationSections.miscLaborOtherHours);
    const miscLaborOther2Hours = getNum(estimationSections.miscLaborOther2Hours);
    const totalLaborHours = plantFabricationHours + miscLaborHours + miscLaborOtherHours + miscLaborOther2Hours;
    const hourlyLaborRate = getNum(estimationSections.hourlyLaborRate, 60.0);
    const totalDirectplantCost = totalLaborHours * hourlyLaborRate;

    const numTrucks = getNum(estimationSections.numTrucks, 3);
    const hoursPerTruck = getNum(estimationSections.hoursPerTruck, 3);
    const galvanizingTrucks = getNum(estimationSections.galvanizingTrucks, 5);
    const galvHoursPerTruck = getNum(estimationSections.galvHoursPerTruck, 5.0);
    const shippingRate = getNum(estimationSections.shippingRate, 195.0);

    const totalShippingHours = (numTrucks * hoursPerTruck) + (galvanizingTrucks * galvHoursPerTruck);
    const totalShippingCost = totalShippingHours * shippingRate;
    const plantLaborAndShip = totalDirectplantCost + totalShippingCost;

    // 3. Drafting & Directs Calculations
    const subletDetailingCost = getNum(estimationSections.subletDetailingCost);
    const peStampCost = getNum(estimationSections.peStampCost);
    const otherDirectCosts = getNum(estimationSections.otherDirectCosts);
    const totalDirectDraftingCost = subletDetailingCost + peStampCost;
    const draftingAndDirects = totalDirectDraftingCost + otherDirectCosts;

    // 4. Overhead on Directs Calculations
    const totalDirectCosts = totalMaterialCost + totalDirectplantCost + totalShippingCost + totalDirectDraftingCost + otherDirectCosts;
    const overheadPercent = getNum(estimationSections.overheadPercent, 12.0);
    const directCostOverhead = Math.round(totalDirectCosts * (overheadPercent / 100) * 100) / 100;
    const bidAmountOnDirectCosts = Math.round(totalDirectCosts) + directCostOverhead;

    // 5. Buyouts Calculations
    const steelJoistCost = getNum(estimationSections.steelJoistCost);
    const deckCost = getNum(estimationSections.deckCost);
    const subletErectionCost = getNum(estimationSections.subletErectionCost);
    const miscMetalCost = getNum(estimationSections.miscMetalCost);
    const oshaLinearFeet = getNum(estimationSections.oshaLinearFeet);
    const oshaPostsCost = (oshaLinearFeet / 5) * 50;
    const additionalSafetyCosts = getNum(estimationSections.additionalSafetyCosts);
    const ccipCosts = getNum(estimationSections.ccipCosts);
    const safetyCost = additionalSafetyCosts + ccipCosts;
    const leedSubmissionCost = getNum(estimationSections.leedSubmissionCost);
    const suppliedMaterialCost = getNum(estimationSections.suppliedMaterialCost);
    const useTaxPercent = getNum(estimationSections.useTaxPercent, 6.0);

    const totalDirectBuyoutCosts = steelJoistCost + deckCost + subletErectionCost + miscMetalCost + oshaPostsCost + safetyCost + leedSubmissionCost;
    const useTax = suppliedMaterialCost * (useTaxPercent / 100);
    const totalBuyoutCosts = totalDirectBuyoutCosts + useTax;

    // 6. Overhead on Buyouts Calculations
    const buyoutOverheadPercent = getNum(estimationSections.buyoutOverheadPercent, 12.0);
    const buyoutOverhead = Math.round(totalBuyoutCosts) * (buyoutOverheadPercent / 100);
    const bidAmountOnBuyouts = Math.round(totalBuyoutCosts) + buyoutOverhead;

    // 7. Profit & Misc Calculations
    const profitPercent = getNum(estimationSections.profitPercent, 10.0);
    const miscCharges = getNum(estimationSections.miscCharges);

    const totalAmountBeforeProfit = Math.round(bidAmountOnDirectCosts) + Math.round(bidAmountOnBuyouts);
    const profitAmount = totalAmountBeforeProfit * (profitPercent / 100);
    const finalAmountBeforeMisc = totalAmountBeforeProfit + profitAmount;
    const finalBidAmount = finalAmountBeforeMisc + miscCharges;
    const profitAndMisc = profitAmount + miscCharges;

    // 8. miscellaneous Summary Total Calculations
    const miscellaneousLaborRate = getNum(estimationSections.miscellaneousLaborRate, 85.0);
    const miscellaneousErectionMultiplier = getNum(estimationSections.miscellaneousErectionMultiplier, 1.12);
    const miscellaneousJoistDeckMultiplier = getNum(estimationSections.miscellaneousJoistDeckMultiplier, 1.12);
    const miscellaneousOtherCostMultiplier = getNum(estimationSections.miscellaneousOtherCostMultiplier, 1.12);

    const miscellaneousLaborCost = totalLaborHours * miscellaneousLaborRate;
    const miscellaneousMaterialTotal = totalMaterialCost;
    const miscellaneousTruckingTotal = totalShippingCost;
    const miscellaneousDetailingEngineeringTotal = totalDirectDraftingCost;
    const miscellaneousSubTotal = miscellaneousLaborCost + miscellaneousMaterialTotal + miscellaneousTruckingTotal + miscellaneousDetailingEngineeringTotal;
    
    const miscellaneousErectionTotal = subletErectionCost * miscellaneousErectionMultiplier;
    const taxMultiplier = 1 + useTaxPercent / 100;
    const miscellaneousJoistDeckTotal = ((steelJoistCost + deckCost) * taxMultiplier) * miscellaneousJoistDeckMultiplier;
    const miscellaneousOtherCostsTotal = (miscMetalCost + safetyCost + leedSubmissionCost) * miscellaneousOtherCostMultiplier;
    const miscellaneousTotalBeforeProfit = miscellaneousSubTotal + miscellaneousErectionTotal + miscellaneousJoistDeckTotal + miscellaneousOtherCostsTotal;
    
    const miscellaneousProfitAmount = miscellaneousTotalBeforeProfit * (profitPercent / 100);
    const miscellaneousFinalPrice = miscellaneousTotalBeforeProfit + miscellaneousProfitAmount + miscCharges;

    return {
      finalBidAmount,            // Standard Grand Total
      miscellaneousFinalPrice,   // Misc Summary Total
      totalMaterialCost,         // 1. Material Section
      plantLaborAndShip,         // 2. plant Labor & Ship
      draftingAndDirects,        // 3. Drafting & Directs
      directCostOverhead,        // 4. Overhead on Directs
      totalBuyoutCosts,          // 5. Buyouts Section
      buyoutOverhead,            // 6. Overhead on Buyouts
      profitAndMisc              // 7. Profit & Misc
    };
  };

  const handleLoadProjectInModel = (proj) => {
    const info = {
      projectId: proj.id,
      project: proj.name,
      quoteNum: proj.code || '',
      salesman: proj.project_manager_name || '',
      startDate: proj.erection_date || '',
      location: proj.customer_name || ''
    };
    // Save project specs info to trigger sync on mount in EstimationModel
    localStorage.setItem('sfe_est_project', JSON.stringify(info));
    // Clear out calculated fields so that mount fetches latest state from Project database
    localStorage.removeItem('sfe_est_bid_enquiry');
    localStorage.removeItem('sfe_est_sections');
    
    navigate('/estimation');
  };

  const formatCurrency = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '$0.00';
    return `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filteredRfqs = wonRfqs.filter(rfq => {
    const code = rfq.sfe_job_no ? String(rfq.sfe_job_no) : rfq.quote_no;
    const matchedProj = projects.find(p => p.code === code || p.name === rfq.project_name);
    if (!matchedProj) return false;

    const vals = calculateEstimationValues(matchedProj);
    if (vals.finalBidAmount <= 0) return false;

    const searchLower = search.toLowerCase();
    return (
      (rfq.project_name?.toLowerCase() || '').includes(searchLower) ||
      (String(rfq.sfe_job_no || '')).includes(searchLower) ||
      (rfq.quote_no?.toLowerCase() || '').includes(searchLower)
    );
  });

  const exportToCSV = () => {
    const headers = [
      "Project Name",
      "Standard Grand Total",
      "Misc Summary Total",
      "Total Direct Costs",
      "Drafting & Directs",
      "Overhead on Directs",
      "Buyouts Section",
      "Overhead on Buyouts",
      "Profit & Misc"
    ];
    
    const formatExportVal = (v) => {
      if (v === undefined || v === null || isNaN(v)) return '0';
      const num = Number(v);
      return num === 0 ? '0' : num.toFixed(2);
    };
    
    const rows = filteredRfqs.map(rfq => {
      const code = rfq.sfe_job_no ? String(rfq.sfe_job_no) : rfq.quote_no;
      const matched = projects.find(p => p.code === code || p.name === rfq.project_name) || {};
      const vals = calculateEstimationValues(matched);
      const totalDirect = (vals.totalMaterialCost || 0) + (vals.plantLaborAndShip || 0);
      return [
        rfq.project_name,
        formatExportVal(vals.finalBidAmount),
        formatExportVal(vals.miscellaneousFinalPrice),
        formatExportVal(totalDirect),
        formatExportVal(vals.draftingAndDirects),
        formatExportVal(vals.directCostOverhead),
        formatExportVal(vals.totalBuyoutCosts),
        formatExportVal(vals.buyoutOverhead),
        formatExportVal(vals.profitAndMisc)
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Estimation_Summary_Reports.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(filteredRfqs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRfqs = filteredRfqs.slice(startIndex, startIndex + itemsPerPage);

  if (!isEmbedded) {
    return (
      <div className="min-h-screen bg-slate-50/30 p-4 lg:p-8 space-y-6 animate-fade-in">
        {/* Error notification */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold animate-shake">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Header Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects by name, job number or quote number..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/5 transition-all font-semibold"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setCurrentPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-100 text-slate-400"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportToCSV}
              disabled={loading || wonRfqs.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={() => navigate('/estimation')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all cursor-pointer"
            >
              <Calculator className="w-4 h-4" /> Estimation Model
            </button>
          </div>
        </div>

        {/* Report Table Grid */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider">
                  <th className="px-2 py-3 border-b border-white/10 border-r border-white/5 min-w-[200px]">Project Name</th>
                  <th className="px-2 py-3.5 border-b border-white/10 border-r border-white/5 text-right w-[125px]">Total Bid Amount</th>
                  <th className="px-2 py-3.5 border-b border-white/10 border-r border-white/5 text-right w-[125px]">Misc Summary Total</th>
                  <th className="px-2 py-3.5 border-b border-white/10 border-r border-white/5 text-right w-[120px]">Total Direct Costs</th>
                  <th className="px-2 py-3.5 border-b border-white/10 border-r border-white/5 text-right w-[120px]">Drafting & Directs</th>
                  <th className="px-2 py-3.5 border-b border-white/10 border-r border-white/5 text-right w-[120px]">Overhead on Directs</th>
                  <th className="px-2 py-3.5 border-b border-white/10 border-r border-white/5 text-right w-[120px]">Buyouts Section</th>
                  <th className="px-2 py-3.5 border-b border-white/10 border-r border-white/5 text-right w-[120px]">Overhead on Buyouts</th>
                  <th className="px-2 py-3.5 border-b border-white/10 border-r border-white/5 text-right w-[120px]">Profit & Misc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-[12px]">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2" />
                      <p className="text-xs font-bold text-slate-400">Loading estimation reports...</p>
                    </td>
                  </tr>
                ) : paginatedRfqs.length > 0 ? (
                  paginatedRfqs.map((rfq) => {
                    const code = rfq.sfe_job_no ? String(rfq.sfe_job_no) : rfq.quote_no;
                    const matchedProj = projects.find(p => p.code === code || p.name === rfq.project_name);
                    const hasCalc = matchedProj && matchedProj.estimation_data && Object.keys(matchedProj.estimation_data).length > 0;
                    
                    const vals = matchedProj 
                      ? calculateEstimationValues(matchedProj) 
                      : {
                          finalBidAmount: 0,
                          miscellaneousFinalPrice: 0,
                          totalMaterialCost: 0,
                          plantLaborAndShip: 0,
                          draftingAndDirects: 0,
                          directCostOverhead: 0,
                          totalBuyoutCosts: 0,
                          buyoutOverhead: 0,
                          profitAndMisc: 0
                        };

                    return (
                      <tr key={rfq.id} className="transition-colors hover:bg-slate-50/50">
                        <td className="px-2 py-3 border-r border-slate-100 text-slate-800 break-words leading-tight">
                          <div className="flex flex-col">
                            {matchedProj ? (
                              <button
                                onClick={() => handleLoadProjectInModel(matchedProj)}
                                className="text-left font-bold text-slate-800 hover:text-amber-600 transition-colors inline-flex items-center gap-1.5 group/proj w-full"
                                title={hasCalc ? "Edit Calculations in Model" : "Initialize Model Setup"}
                              >
                                <span>{rfq.project_name}</span>
                                <Pen className={`w-3.5 h-3.5 shrink-0 ${hasCalc ? 'text-black' : 'text-slate-300'} opacity-60 group-hover/proj:opacity-100 transition-opacity`} />
                              </button>
                            ) : (
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-500 italic">{rfq.project_name}</span>
                                <span className="text-[9px] text-red-500/80 font-semibold uppercase tracking-wider">Unsynced Project</span>
                              </div>
                            )}
                            <span className="text-[9px] font-mono text-slate-400 mt-0.5">
                              {rfq.sfe_job_no ? `Job #${rfq.sfe_job_no}` : `Quote ${rfq.quote_no}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-3 border-r border-slate-100 text-right font-black text-slate-800">
                          {formatCurrency(vals.finalBidAmount)}
                        </td>
                        <td className="px-2 py-3 border-r border-slate-100 text-right font-extrabold text-amber-600">
                          {formatCurrency(vals.miscellaneousFinalPrice)}
                        </td>
                        <td className="px-2 py-3 border-r border-slate-100 text-right text-slate-700">
                          {formatCurrency((vals.totalMaterialCost || 0) + (vals.plantLaborAndShip || 0))}
                        </td>
                        <td className="px-2 py-3 border-r border-slate-100 text-right text-slate-700">
                          {formatCurrency(vals.draftingAndDirects)}
                        </td>
                        <td className="px-2 py-3 border-r border-slate-100 text-right text-slate-650">
                          {formatCurrency(vals.directCostOverhead)}
                        </td>
                        <td className="px-2 py-3 border-r border-slate-100 text-right text-slate-700">
                          {formatCurrency(vals.totalBuyoutCosts)}
                        </td>
                        <td className="px-2 py-3 border-r border-slate-100 text-right text-slate-650">
                          {formatCurrency(vals.buyoutOverhead)}
                        </td>
                        <td className="px-2 py-3 border-r border-slate-100 text-right text-slate-700">
                          {formatCurrency(vals.profitAndMisc)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center text-slate-500 font-medium italic">No estimated projects found. Use the Estimation Model to perform bid calculations first.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {filteredRfqs.length} {filteredRfqs.length === 1 ? 'Record' : 'Records'} Found
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === i + 1 ? 'bg-amber-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200 cursor-pointer'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // EMBEDDED SINGLE-PROJECT SUMMARY VIEW GRAPHICS (Original JSX Render)
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-6 p-2 animate-fade-in">
      {/* Active Project Details Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Active Project</span>
          <h3 className="text-lg font-black text-slate-800 mt-1">
            {activeProjectInfo.project ? `#${activeProjectInfo.quoteNum || 'SFE'}-${activeProjectInfo.project}` : 'No project selected'}
          </h3>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 mt-2 text-xs text-slate-505 font-medium">
            {activeProjectInfo.location && <span>Location: <strong className="text-slate-700">{activeProjectInfo.location}</strong></span>}
            {activeProjectInfo.date && <span>Date: <strong className="text-slate-700">{activeProjectInfo.date}</strong></span>}
            {activeProjectInfo.salesman && <span>Salesman: <strong className="text-slate-700">{activeProjectInfo.salesman}</strong></span>}
          </div>
        </div>
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl w-full md:w-auto justify-between md:justify-start">
          <div className="text-right">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Estimation Weight</span>
            <span className="text-base font-black text-slate-800">
              {activeTotalTons.toFixed(3)} <span className="text-xs font-bold text-slate-505">Tons</span>
            </span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-right">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Total Labor Hours</span>
            <span className="text-base font-black text-slate-800">
              {activeTotalLaborHours} <span className="text-xs font-bold text-slate-505">Hrs</span>
            </span>
          </div>
        </div>
      </div>

      {/* Primary KPI Cards (Standard vs miscellaneous) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Standard Bid Grand Total */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden border border-white/[0.06] shadow-xl shadow-slate-900/10">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex justify-between items-start gap-4">
            <div>
              <span className="text-[10px] font-black text-amber-400/90 uppercase tracking-widest block">Total Bid Amount</span>
              <h4 className="text-3xl font-black mt-2 tracking-tight">
                {formatCurrency(activeFinalBidAmount)}
              </h4>
              <p className="text-xs text-slate-350 mt-1 font-semibold">
                Per Ton Rate: {formatCurrency(activeHasTons ? (activeFinalBidAmount / activeTotalTons) : 0)} /Ton
              </p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/25 p-3 rounded-2xl">
              <Calculator className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold">Includes Profit & Misc charges</span>
            <button
              onClick={() => handleEditSection('finalTotals')}
              className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold hover:translate-x-0.5 transition-all cursor-pointer"
            >
              Adjust Profit
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* miscellaneous Final Summary Price */}
        <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 rounded-[2rem] p-6 md:p-8 text-white relative overflow-hidden border border-amber-400/10 shadow-xl shadow-orange-500/10">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex justify-between items-start gap-4">
            <div>
              <span className="text-[10px] font-black text-amber-100 uppercase tracking-widest block">miscellaneous Summary Total</span>
              <h4 className="text-3xl font-black mt-2 tracking-tight">
                {formatCurrency(activeMiscellaneousFinalPrice)}
              </h4>
              <p className="text-xs text-amber-50 mt-1 font-semibold">
                Per Ton Rate: {formatCurrency(activeHasTons ? (activeMiscellaneousFinalPrice / activeTotalTons) : 0)} /Ton
              </p>
            </div>
            <div className="bg-white/10 border border-white/20 p-3 rounded-2xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-amber-100 font-semibold">Calculated using miscellaneous multipliers</span>
            <button
              onClick={() => handleEditSection('miscellaneous')}
              className="flex items-center gap-1.5 text-white hover:text-amber-100 font-bold hover:translate-x-0.5 transition-all cursor-pointer"
            >
              Adjust Multipliers
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid of the 7 sections breakdown KPI cards */}
      <div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 mb-5">
          Section-by-Section Totals
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          
          {/* Card 1: Material Cost */}
          <div className="bg-white rounded-[1.75rem] border border-slate-200 hover:border-blue-400 p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start gap-3">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-wider bg-blue-50 px-2.5 py-1 rounded-lg">
                  1. Material Section
                </span>
                <h4 className="text-xl font-extrabold text-slate-800 pt-2">
                  {formatCurrency(activeTotalMaterialCost)}
                </h4>
                <p className="text-[10.5px] font-semibold text-slate-400">
                  {formatCurrency(activeHasTons ? (activeTotalMaterialCost / activeTotalTons) : 0)} /Ton
                </p>
              </div>
              <div className="bg-blue-50 p-2.5 rounded-xl text-blue-500 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 italic">Direct + Use Tax</span>
              <button
                onClick={() => handleEditSection('material')}
                className="text-blue-500 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform cursor-pointer"
              >
                Edit inputs
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Card 2: plant Labor & Shipping */}
          <div className="bg-white rounded-[1.75rem] border border-slate-200 hover:border-green-400 p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start gap-3">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-green-600 uppercase tracking-wider bg-green-50 px-2.5 py-1 rounded-lg">
                  2. plant Labor & Ship
                </span>
                <h4 className="text-xl font-extrabold text-slate-800 pt-2">
                  {formatCurrency(activeTotalDirectplantCost + activeTotalShippingCost)}
                </h4>
                <p className="text-[10.5px] font-semibold text-slate-400">
                  {formatCurrency(activeHasTons ? ((activeTotalDirectplantCost + activeTotalShippingCost) / activeTotalTons) : 0)} /Ton
                </p>
              </div>
              <div className="bg-green-50 p-2.5 rounded-xl text-green-600 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 italic">{activeTotalLaborHours} Hrs + Freight</span>
              <button
                onClick={() => handleEditSection('plantLabor')}
                className="text-green-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform cursor-pointer"
              >
                Edit inputs
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Card 3: Drafting & Direct Costs */}
          <div className="bg-white rounded-[1.75rem] border border-slate-200 hover:border-teal-400 p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start gap-3">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-teal-600 uppercase tracking-wider bg-teal-50 px-2.5 py-1 rounded-lg">
                  3. Drafting & Directs
                </span>
                <h4 className="text-xl font-extrabold text-slate-800 pt-2">
                  {formatCurrency(activeTotalDirectDraftingCost + activeOtherDirectCostsVal)}
                </h4>
                <p className="text-[10.5px] font-semibold text-slate-400">
                  {formatCurrency(activeHasTons ? ((activeTotalDirectDraftingCost + activeOtherDirectCostsVal) / activeTotalTons) : 0)} /Ton
                </p>
              </div>
              <div className="bg-teal-50 p-2.5 rounded-xl text-teal-600 group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 italic">Detailing + PE Stamp</span>
              <button
                onClick={() => handleEditSection('drafting')}
                className="text-teal-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform cursor-pointer"
              >
                Edit inputs
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Card 4: Profit on Direct Costs */}
          <div className="bg-white rounded-[1.75rem] border border-slate-200 hover:border-purple-400 p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start gap-3">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-purple-600 uppercase tracking-wider bg-purple-50 px-2.5 py-1 rounded-lg">
                  4. Overhead on Directs
                </span>
                <h4 className="text-xl font-extrabold text-slate-800 pt-2">
                  {formatCurrency(activeDirectCostOverhead)}
                </h4>
                <p className="text-[10.5px] font-semibold text-slate-400">
                  {formatCurrency(activeHasTons ? (activeDirectCostOverhead / activeTotalTons) : 0)} /Ton
                </p>
              </div>
              <div className="bg-purple-50 p-2.5 rounded-xl text-purple-600 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 italic">Rate: {activeOverheadPercentVal}%</span>
              <button
                onClick={() => handleEditSection('profitDirect')}
                className="text-purple-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform cursor-pointer"
              >
                Edit inputs
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Card 5: Buyouts Section */}
          <div className="bg-white rounded-[1.75rem] border border-slate-200 hover:border-indigo-400 p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start gap-3">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2.5 py-1 rounded-lg">
                  5. Buyouts Section
                </span>
                <h4 className="text-xl font-extrabold text-slate-800 pt-2">
                  {formatCurrency(activeTotalBuyoutCosts)}
                </h4>
                <p className="text-[10.5px] font-semibold text-slate-400">
                  {formatCurrency(activeHasTons ? (activeTotalBuyoutCosts / activeTotalTons) : 0)} /Ton
                </p>
              </div>
              <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600 group-hover:scale-105 transition-transform">
                <Box className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 italic">Joist + Erection + Tax</span>
              <button
                onClick={() => handleEditSection('buyouts')}
                className="text-indigo-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform cursor-pointer"
              >
                Edit inputs
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Card 6: Profit on Buyouts */}
          <div className="bg-white rounded-[1.75rem] border border-slate-200 hover:border-pink-400 p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start gap-3">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-pink-600 uppercase tracking-wider bg-pink-50 px-2.5 py-1 rounded-lg">
                  6. Overhead on Buyouts
                </span>
                <h4 className="text-xl font-extrabold text-slate-800 pt-2">
                  {formatCurrency(activeBuyoutOverhead)}
                </h4>
                <p className="text-[10.5px] font-semibold text-slate-400">
                  {formatCurrency(activeHasTons ? (activeBuyoutOverhead / activeTotalTons) : 0)} /Ton
                </p>
              </div>
              <div className="bg-pink-50 p-2.5 rounded-xl text-pink-600 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 italic">Rate: {activeBuyoutOverheadPercentVal}%</span>
              <button
                onClick={() => handleEditSection('profitBuyouts')}
                className="text-pink-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform cursor-pointer"
              >
                Edit inputs
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Card 7: Profit & Misc (Final Totals) */}
          <div className="bg-white rounded-[1.75rem] border border-slate-200 hover:border-orange-400 p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group">
            <div className="flex justify-between items-start gap-3">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-orange-600 uppercase tracking-wider bg-orange-50 px-2.5 py-1 rounded-lg">
                  7. Profit & Misc
                </span>
                <h4 className="text-xl font-extrabold text-slate-800 pt-2">
                  {formatCurrency(activeProfitAmount + activeMiscChargesVal)}
                </h4>
                <p className="text-[10.5px] font-semibold text-slate-400">
                  {formatCurrency(activeHasTons ? ((activeProfitAmount + activeMiscChargesVal) / activeTotalTons) : 0)} /Ton
                </p>
              </div>
              <div className="bg-orange-50 p-2.5 rounded-xl text-orange-600 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 italic">{activeProfitPercentVal}% Profit + Misc Charges</span>
              <button
                onClick={() => handleEditSection('finalTotals')}
                className="text-orange-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform cursor-pointer"
              >
                Edit inputs
                <ArrowUpRight className="w-3.5 h-3" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
