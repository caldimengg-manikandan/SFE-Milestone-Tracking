import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
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
  ChevronsLeft,
  ChevronsRight,
  X,
  Loader2,
  AlertCircle,
  Pen,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { projectAPI, rfqAPI } from '../services/api';
import { toast } from 'react-hot-toast';

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
  const activeOtherCustom1CostVal = Number(activeEstimationSections.otherCustom1Cost) || 0;
  const activeOtherCustom2CostVal = Number(activeEstimationSections.otherCustom2Cost) || 0;
  const activeSuppliedMaterialCostVal = Number(activeEstimationSections.suppliedMaterialCost) || 0;
  const activeUseTaxPercentVal = Number(activeEstimationSections.useTaxPercent) !== undefined && activeEstimationSections.useTaxPercent !== '' ? Number(activeEstimationSections.useTaxPercent) : 6.0;

  const activeTotalDirectBuyoutCosts = activeSteelJoistCostVal + activeDeckCostVal + activeSubletErectionCostVal + activeMiscMetalCostVal + activeOshaPostsCost + activeSafetyCost + activeLeedSubmissionCostVal + activeOtherCustom1CostVal + activeOtherCustom2CostVal;
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

  const activeMiscellaneousOtherCostsTotal = activeTotalBuyoutCosts * activeMiscellaneousOtherCostMultiplierVal;

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
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortField, setSortField] = useState(null); // 'quote_date' | 'bid_due_date'
  const [sortOrder, setSortOrder] = useState(null); // 'asc' | 'desc' | 'urgent'
  const [rebidConfirmation, setRebidConfirmation] = useState({
    isOpen: false,
    project: null,
    rfq: null
  });

  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [decisionFilter, setDecisionFilter] = useState('all');

  const uniqueCustomers = useMemo(() => {
    const custs = wonRfqs.map(r => r.customer_name).filter(Boolean);
    return Array.from(new Set(custs)).sort();
  }, [wonRfqs]);

  const uniqueDecisions = useMemo(() => {
    const decs = wonRfqs.map(r => r.decision_to_bid).filter(Boolean);
    return Array.from(new Set(decs)).sort();
  }, [wonRfqs]);

  const getDaysDifference = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    
    const target = new Date(y, m, d);
    target.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleSort = (field) => {
    setCurrentPage(1);
    if (field === 'quote_date') {
      if (sortField !== 'quote_date') {
        setSortField('quote_date');
        setSortOrder('desc'); // default to newest first
      } else if (sortOrder === 'desc') {
        setSortOrder('asc');
      } else {
        setSortField(null);
        setSortOrder(null);
      }
    }
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '-';
    const cleanStr = String(dateStr).split('T')[0];
    const parts = cleanStr.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[1]}-${parts[2]}-${parts[0]}`;
      }
      if (parts[2].length === 4) {
        return `${parts[0]}-${parts[1]}-${parts[2]}`;
      }
    }
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${m}-${d}-${y}`;
  };

  useEffect(() => {
    if (isEmbedded) return; // Skip loading if embedded in modal

    const fetchAllData = async () => {
      try {
        setLoading(true);
        setError('');
        const [projRes, rfqRes] = await Promise.all([
          projectAPI.getAll({ page_size: 1000 }),
          rfqAPI.getAll({ page_size: 1000 })
        ]);

        const projData = projRes.data.results || projRes.data;
        const rfqData = rfqRes.data.results || rfqRes.data;

        if (Array.isArray(projData)) setProjects(projData);
        if (Array.isArray(rfqData)) {
          // Filter RFQs where decision_to_bid is "Yes" or "Bid" (case-insensitive)
          const filtered = rfqData.filter(rfq => {
            const dec = (rfq.decision_to_bid || '').toLowerCase().trim();
            return dec === 'yes' || dec === 'bid';
          });
          // Sort RFQs descending by job number or quote number
          const sorted = [...filtered].sort((a, b) => {
            const aVal = String(a.sfe_job_no || a.quote_no || '');
            const bVal = String(b.sfe_job_no || b.quote_no || '');
            return bVal.localeCompare(aVal, undefined, { numeric: true });
          });
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
    const otherCustom1Cost = getNum(estimationSections.otherCustom1Cost);
    const otherCustom2Cost = getNum(estimationSections.otherCustom2Cost);
    const suppliedMaterialCost = getNum(estimationSections.suppliedMaterialCost);
    const useTaxPercent = getNum(estimationSections.useTaxPercent, 6.0);

    const totalDirectBuyoutCosts = steelJoistCost + deckCost + subletErectionCost + miscMetalCost + oshaPostsCost + safetyCost + leedSubmissionCost + otherCustom1Cost + otherCustom2Cost;
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
    const miscellaneousOtherCostsTotal = totalBuyoutCosts * miscellaneousOtherCostMultiplier;
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

  const handleLoadProjectInModel = (proj, rfq) => {
    if (proj) {
      const info = {
        projectId: proj.id,
        project: proj.name,
        quoteNum: proj.code || '',
        salesman: proj.project_manager_name || '',
        startDate: proj.erection_date || '',
        location: rfq?.location || proj.customer_name || ''
      };
      localStorage.setItem('sfe_est_project', JSON.stringify(info));
      localStorage.removeItem('sfe_est_bid_enquiry');
      localStorage.removeItem('sfe_est_sections');
      localStorage.setItem('sfe_erection_project_id', proj.id);
    } else if (rfq) {
      const info = {
        projectId: '',
        project: rfq.project_name || '',
        quoteNum: rfq.sfe_job_no ? String(rfq.sfe_job_no) : (rfq.quote_no || ''),
        salesman: rfq.primary_estimator ? rfq.primary_estimator.full_name : '',
        startDate: rfq.contract_executed_date || rfq.awarded_job_date || '',
        location: rfq.location || ''
      };
      localStorage.setItem('sfe_est_project', JSON.stringify(info));
      localStorage.removeItem('sfe_est_bid_enquiry');
      localStorage.removeItem('sfe_est_sections');
      localStorage.setItem('sfe_erection_project_id', `rfq_${rfq.id}`);
    }
    navigate('/estimation-erection/estimation');
  };

  const formatCurrency = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '$0.00';
    return `$${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filteredRfqs = wonRfqs.filter(rfq => {
    // 1. Search text filter
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || (
      (rfq.project_name?.toLowerCase() || '').includes(searchLower) ||
      (String(rfq.sfe_job_no || '')).includes(searchLower) ||
      (rfq.quote_no?.toLowerCase() || '').includes(searchLower) ||
      (rfq.customer_name?.toLowerCase() || '').includes(searchLower)
    );

    // 2. Customer filter
    const matchesCustomer = customerFilter === 'all' || rfq.customer_name === customerFilter;

    // 3. Decision filter
    const matchesDecision = decisionFilter === 'all' || rfq.decision_to_bid === decisionFilter;

    let estStatus = 'yet to start';
    const code = rfq.sfe_job_no ? String(rfq.sfe_job_no) : rfq.quote_no;
    const matchedProj = projects.find(p => p.code === code || p.name === rfq.project_name);
    if (matchedProj && matchedProj.estimation_data && Object.keys(matchedProj.estimation_data).length > 0) {
      const savedStatus = matchedProj.estimation_data?.projectInfo?.estimationStatus;
      if (savedStatus === 'submitted') {
        estStatus = 'submitted';
      } else if (savedStatus === 'rebid') {
        estStatus = 'rebid';
      } else if (savedStatus === 'in progress') {
        estStatus = 'in progress';
      } else {
        estStatus = 'yet to start';
      }
    }
    const matchesStatus = statusFilter === 'all' || estStatus === statusFilter;

    return matchesSearch && matchesCustomer && matchesDecision && matchesStatus;
  });

  const sortedRfqs = [...filteredRfqs].sort((a, b) => {
    if (!sortField) return 0;

    if (sortField === 'quote_date') {
      const dateA = a.quote_date ? new Date(a.quote_date) : null;
      const dateB = b.quote_date ? new Date(b.quote_date) : null;

      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;

      return sortOrder === 'asc'
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime();
    }

    return 0;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'submitted':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border bg-emerald-50 text-emerald-700 border-emerald-200">
            Submitted
          </span>
        );
      case 'rebid':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border bg-purple-50 text-purple-700 border-purple-200">
            Rebid
          </span>
        );
      case 'in progress':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border bg-blue-50 text-blue-700 border-blue-200">
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border bg-slate-50 text-slate-500 border-slate-200">
            Yet to Start
          </span>
        );
    }
  };

  const handleStatusClick = (status, matchedProj, rfq) => {
    if (status === 'submitted') {
      setRebidConfirmation({
        isOpen: true,
        project: matchedProj,
        rfq: rfq
      });
    } else {
      handleLoadProjectInModel(matchedProj, rfq);
    }
  };

  const exportToExcel = () => {
    const headers = [
      "RFQ Date",
      "Project Name",
      "Customer Name",
      "Bid Due Date",
      "Decision to Bid",
      "Estimation Status",
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
      if (v === undefined || v === null || isNaN(v)) return 0;
      return Number(v);
    };
    
    const rows = sortedRfqs.map(rfq => {
      const code = rfq.sfe_job_no ? String(rfq.sfe_job_no) : rfq.quote_no;
      const matched = projects.find(p => p.code === code || p.name === rfq.project_name) || {};
      const vals = calculateEstimationValues(matched);
      const totalDirect = (vals.totalMaterialCost || 0) + (vals.plantLaborAndShip || 0);
      
      let estStatus = 'yet to start';
      if (matched && matched.estimation_data && Object.keys(matched.estimation_data).length > 0) {
        const savedStatus = matched.estimation_data?.projectInfo?.estimationStatus;
        if (savedStatus === 'submitted') {
          estStatus = 'submitted';
        } else if (savedStatus === 'rebid') {
          estStatus = 'rebid';
        } else if (savedStatus === 'in progress') {
          estStatus = 'in progress';
        } else {
          estStatus = 'yet to start';
        }
      }
      const formattedStatus = estStatus === 'submitted' ? 'Submitted' : (estStatus === 'rebid' ? 'Rebid' : (estStatus === 'in progress' ? 'In Progress' : 'Yet to Start'));

      return [
        formatShortDate(rfq.quote_date),
        rfq.project_name || '',
        rfq.customer_name || '',
        formatShortDate(rfq.bid_due_date),
        rfq.decision_to_bid || '',
        formattedStatus,
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

    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    worksheet['!cols'] = [
      { wch: 12 }, // RFQ Date
      { wch: 28 }, // Project Name
      { wch: 24 }, // Customer Name
      { wch: 12 }, // Bid Due Date
      { wch: 15 }, // Decision to Bid
      { wch: 18 }, // Estimation Status
      { wch: 20 }, // Standard Grand Total
      { wch: 20 }, // Misc Summary Total
      { wch: 18 }, // Total Direct Costs
      { wch: 18 }, // Drafting & Directs
      { wch: 18 }, // Overhead on Directs
      { wch: 18 }, // Buyouts Section
      { wch: 18 }, // Overhead on Buyouts
      { wch: 18 }  // Profit & Misc
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Estimation Summary");
    XLSX.writeFile(workbook, `Estimation_Summary_Reports_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const totalPages = Math.ceil(sortedRfqs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRfqs = sortedRfqs.slice(startIndex, startIndex + itemsPerPage);

  if (!isEmbedded) {
    return (
      <div className="h-[calc(100vh-72px)] -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 bg-slate-50/30 flex flex-col overflow-hidden animate-fade-in gap-4">
        {/* Error notification */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold animate-shake">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Header Toolbar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm shrink-0">
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 flex-1 min-w-0">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects by name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/5 transition-all font-semibold text-slate-700 placeholder-slate-400"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setCurrentPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-slate-100 text-slate-400"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Customer Filter */}
            <select
              value={customerFilter}
              onChange={(e) => { setCustomerFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-650 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/5 transition-all bg-white cursor-pointer max-w-[180px]"
            >
              <option value="all">All Customers</option>
              {uniqueCustomers.map(cust => (
                <option key={cust} value={cust}>{cust}</option>
              ))}
            </select>

            {/* Decision Filter */}
            <select
              value={decisionFilter}
              onChange={(e) => { setDecisionFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-650 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/5 transition-all bg-white cursor-pointer max-w-[150px]"
            >
              <option value="all">All Decisions</option>
              {uniqueDecisions.map(dec => (
                <option key={dec} value={dec}>{dec}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-650 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/5 transition-all bg-white cursor-pointer max-w-[150px]"
            >
              <option value="all">All Statuses</option>
              <option value="yet to start">Yet to Start</option>
              <option value="in progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="rebid">Rebid</option>
            </select>

            {/* Clear Filters Button */}
            {(search || customerFilter !== 'all' || decisionFilter !== 'all' || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setCustomerFilter('all');
                  setDecisionFilter('all');
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100/80 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={exportToExcel}
              disabled={loading || wonRfqs.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-650 text-xs font-bold hover:bg-slate-50 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Download Excel
            </button>
            <button
              onClick={() => navigate('/estimation')}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" /> Estimation Model
            </button>
          </div>
        </div>

        {/* Report Table Grid */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 orange-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1280px]">
              <thead>
                <tr className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider select-none">
                  {/* Frozen Columns Header */}
                  <th className="px-1.5 py-3 border-b border-white/10 border-r border-white/5 sticky left-0 top-0 bg-[#d97706] z-30 min-w-[35px] max-w-[35px] text-center whitespace-nowrap">S.No</th>
                  <th 
                    onClick={() => handleSort('quote_date')}
                    className="px-1.5 py-3 border-b border-white/10 border-r border-white/5 sticky left-[35px] top-0 bg-[#d97706] hover:bg-[#b55c05] z-30 min-w-[75px] max-w-[75px] text-center cursor-pointer select-none transition-colors group"
                    title="Click to sort by RFQ Date"
                  >
                    <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                      <span>RFQ Date</span>
                      {sortField === 'quote_date' ? (
                        sortOrder === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-white animate-fade-in" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-white animate-fade-in" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-white/50 group-hover:text-white/90 transition-colors" />
                      )}
                    </div>
                  </th>
                  <th className="px-1.5 py-3 border-b border-white/10 border-r border-white/5 sticky left-[110px] top-0 bg-[#d97706] z-30 min-w-[140px] max-w-[140px] whitespace-normal">Project Name</th>
                  <th className="px-1.5 py-3 border-b border-white/10 border-r border-white/5 sticky left-[250px] top-0 bg-[#d97706] z-30 min-w-[120px] max-w-[120px] whitespace-normal">Customer Name</th>
                  <th className="px-1.5 py-3 border-b border-white/10 border-r border-white/5 sticky left-[370px] top-0 bg-[#d97706] z-30 min-w-[75px] max-w-[75px] text-center whitespace-nowrap">
                    Bid Due
                  </th>
                  <th className="px-1.5 py-3 border-b border-white/10 border-r border-white/5 sticky left-[445px] top-0 bg-[#d97706] z-30 min-w-[80px] max-w-[80px] text-center border-r-2 border-amber-600/35 shadow-[2px_0_5px_rgba(0,0,0,0.05)] whitespace-nowrap">Decision</th>
                  
                  {/* Scrolling columns */}
                  <th className="px-1.5 py-3.5 border-b border-white/10 border-r border-white/5 text-center w-[85px] min-w-[85px] max-w-[85px] whitespace-nowrap sticky top-0 bg-[#d97706] z-20">Status</th>
                  <th className="px-1.5 py-3.5 border-b border-white/10 border-r border-white/5 text-right w-[100px] min-w-[100px] max-w-[100px] sticky top-0 bg-[#d97706] z-20">Total Bid</th>
                  <th className="px-1.5 py-3.5 border-b border-white/10 border-r border-white/5 text-right w-[100px] min-w-[100px] max-w-[100px] sticky top-0 bg-[#d97706] z-20">Misc Total</th>
                  <th className="px-1.5 py-3.5 border-b border-white/10 border-r border-white/5 text-right w-[100px] min-w-[100px] max-w-[100px] sticky top-0 bg-[#d97706] z-20">Direct Costs</th>
                  <th className="px-1.5 py-3.5 border-b border-white/10 border-r border-white/5 text-right w-[100px] min-w-[100px] max-w-[100px] sticky top-0 bg-[#d97706] z-20">Drafting</th>
                  <th className="px-1.5 py-3.5 border-b border-white/10 border-r border-white/5 text-right w-[100px] min-w-[100px] max-w-[100px] sticky top-0 bg-[#d97706] z-20">OH Directs</th>
                  <th className="px-1.5 py-3.5 border-b border-white/10 border-r border-white/5 text-right w-[100px] min-w-[100px] max-w-[100px] sticky top-0 bg-[#d97706] z-20">Buyouts</th>
                  <th className="px-1.5 py-3.5 border-b border-white/10 border-r border-white/5 text-right w-[100px] min-w-[100px] max-w-[100px] sticky top-0 bg-[#d97706] z-20">OH Buyouts</th>
                  <th className="px-1.5 py-3.5 border-b border-white/10 border-r border-white/5 text-right w-[95px] min-w-[95px] max-w-[95px] sticky top-0 bg-[#d97706] z-20">Profit/Misc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-[12px]">
                {loading ? (
                  <tr>
                    <td colSpan="15" className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2" />
                      <p className="text-xs font-bold text-slate-400">Loading estimation reports...</p>
                    </td>
                  </tr>
                ) : paginatedRfqs.length > 0 ? (
                  paginatedRfqs.map((rfq, index) => {
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

                    let estStatus = 'yet to start';
                    if (matchedProj && matchedProj.estimation_data && Object.keys(matchedProj.estimation_data).length > 0) {
                      const savedStatus = matchedProj.estimation_data?.projectInfo?.estimationStatus;
                      if (savedStatus === 'submitted') {
                        estStatus = 'submitted';
                      } else if (savedStatus === 'rebid') {
                        estStatus = 'rebid';
                      } else if (savedStatus === 'in progress') {
                        estStatus = 'in progress';
                      } else {
                        estStatus = 'yet to start';
                      }
                    }

                    return (
                      <tr key={rfq.id} className="group transition-colors hover:bg-slate-50/50">
                        {/* Frozen Columns Body Cells */}
                        <td className="px-1.5 py-2.5 border-r border-slate-100 text-center text-slate-400 font-semibold sticky left-0 bg-white group-hover:bg-slate-50/75 z-10 min-w-[35px] max-w-[35px] whitespace-nowrap">
                          {startIndex + index + 1}
                        </td>
                        <td className="px-1.5 py-2.5 border-r border-slate-100 text-center text-slate-600 sticky left-[35px] bg-white group-hover:bg-slate-50/75 z-10 min-w-[75px] max-w-[75px] whitespace-nowrap">
                          {formatShortDate(rfq.quote_date)}
                        </td>
                        <td className="px-1.5 py-2.5 border-r border-slate-100 text-slate-800 break-words leading-tight sticky left-[110px] bg-white group-hover:bg-slate-50/75 z-10 min-w-[140px] max-w-[140px]">
                          <div className="flex flex-col min-w-0">
                            <button
                               onClick={() => handleLoadProjectInModel(matchedProj, rfq)}
                              className="text-left font-bold text-slate-850 hover:text-amber-600 transition-colors flex items-start gap-1 group/proj w-full"
                              title={hasCalc ? "Edit Calculations in Model" : "Initialize Model Setup"}
                            >
                              <span className="line-clamp-2 break-words text-[11px] leading-tight flex-1 whitespace-normal">{rfq.project_name}</span>
                              <Pen className={`w-3 h-3 shrink-0 mt-0.5 ${hasCalc ? 'text-amber-600 font-bold' : 'text-slate-300'} opacity-70 group-hover/proj:opacity-100 transition-opacity`} />
                            </button>
                            <span className="text-[9px] font-mono text-slate-400 mt-0.5 leading-none">
                              {rfq.sfe_job_no ? `Job #${rfq.sfe_job_no}` : `Quote ${rfq.quote_no}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-1.5 py-2.5 border-r border-slate-100 text-slate-600 sticky left-[250px] bg-white group-hover:bg-slate-50/75 z-10 min-w-[120px] max-w-[120px]" title={rfq.customer_name || 'N/A'}>
                          <span className="line-clamp-2 break-words text-[11px] leading-tight block whitespace-normal">{rfq.customer_name || '—'}</span>
                        </td>
                        {(() => {
                          const diffDays = getDaysDifference(rfq.bid_due_date);
                          let dateColorClass = 'text-slate-650';
                          let dateBgClass = 'bg-white';
                          let dateBadge = null;

                          if (diffDays !== null) {
                            if (diffDays === 1) {
                              dateColorClass = 'text-amber-800 font-bold';
                              dateBgClass = 'bg-amber-50/70';
                              dateBadge = (
                                <span className="block text-[8px] leading-none text-amber-600 font-black uppercase mt-0.5">
                                  Due Tomorrow
                                </span>
                              );
                            } else if (diffDays === 0) {
                              dateColorClass = 'text-orange-800 font-bold';
                              dateBgClass = 'bg-orange-50/70';
                              dateBadge = (
                                <span className="block text-[8px] leading-none text-orange-600 font-black uppercase mt-0.5">
                                  Due Today
                                </span>
                              );
                            } else if (diffDays < 0) {
                              dateColorClass = 'text-red-800 font-bold';
                              dateBgClass = 'bg-red-50/70';
                              dateBadge = null;
                            }
                          }

                          return (
                            <td className={`px-1.5 py-2.5 border-r border-slate-100 text-center sticky left-[370px] z-10 min-w-[75px] max-w-[75px] transition-colors group-hover:bg-slate-50/75 ${dateBgClass} ${dateColorClass}`}>
                              <div className="flex flex-col items-center justify-center">
                                <span className="text-[11px]">{formatShortDate(rfq.bid_due_date)}</span>
                                {dateBadge}
                              </div>
                            </td>
                          );
                        })()}
                        <td className="px-1.5 py-2.5 text-center sticky left-[445px] bg-white group-hover:bg-slate-50/75 z-10 min-w-[80px] max-w-[80px] border-r-2 border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide border ${
                            (rfq.decision_to_bid || '').toLowerCase().trim() === 'yes'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {rfq.decision_to_bid || 'Pending'}
                          </span>
                        </td>
                        
                        <td className="px-1.5 py-2.5 border-r border-slate-100 text-center w-[85px] min-w-[85px] max-w-[85px]">
                          <button
                            onClick={() => handleStatusClick(estStatus, matchedProj, rfq)}
                            className="focus:outline-none hover:scale-105 transition-transform cursor-pointer"
                            title={estStatus === 'submitted' ? "Click to rebid" : "Click to go to estimation module"}
                          >
                            {getStatusBadge(estStatus)}
                          </button>
                        </td>

                        {/* Scrolling Columns Body Cells */}
                        <td className="px-1.5 py-2.5 border-r border-slate-100 text-right font-black text-slate-800 w-[100px] min-w-[100px] max-w-[100px]">
                          {estStatus === 'yet to start' ? '—' : formatCurrency(vals.finalBidAmount)}
                        </td>
                        <td className="px-1.5 py-2.5 border-r border-slate-100 text-right font-extrabold text-amber-600 w-[100px] min-w-[100px] max-w-[100px]">
                          {estStatus === 'yet to start' ? '—' : formatCurrency(vals.miscellaneousFinalPrice)}
                        </td>
                        <td className="px-1.5 py-2.5 border-r border-slate-100 text-right text-slate-700 w-[100px] min-w-[100px] max-w-[100px]">
                          {estStatus === 'yet to start' ? '—' : formatCurrency((vals.totalMaterialCost || 0) + (vals.plantLaborAndShip || 0))}
                        </td>
                        <td className="px-1.5 py-2.5 border-r border-slate-100 text-right text-slate-700 w-[100px] min-w-[100px] max-w-[100px]">
                          {estStatus === 'yet to start' ? '—' : formatCurrency(vals.draftingAndDirects)}
                        </td>
                        <td className="px-1.5 py-2.5 border-r border-slate-100 text-right text-slate-650 w-[100px] min-w-[100px] max-w-[100px]">
                          {estStatus === 'yet to start' ? '—' : formatCurrency(vals.directCostOverhead)}
                        </td>
                        <td className="px-1.5 py-2.5 border-r border-slate-100 text-right text-slate-700 w-[100px] min-w-[100px] max-w-[100px]">
                          {estStatus === 'yet to start' ? '—' : formatCurrency(vals.totalBuyoutCosts)}
                        </td>
                        <td className="px-1.5 py-2.5 border-r border-slate-100 text-right text-slate-650 w-[100px] min-w-[100px] max-w-[100px]">
                          {estStatus === 'yet to start' ? '—' : formatCurrency(vals.buyoutOverhead)}
                        </td>
                        <td className="px-1.5 py-2.5 border-r border-slate-100 text-right text-slate-700 w-[95px] min-w-[95px] max-w-[95px]">
                          {estStatus === 'yet to start' ? '—' : formatCurrency(vals.profitAndMisc)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="15" className="px-6 py-12 text-center text-slate-500 font-medium italic">No projects found. Check your RFQ Master and filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 flex items-center justify-end gap-6">
            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Page Size:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="text-xs font-semibold text-slate-700 border border-slate-200 rounded-md px-2 py-1 bg-white outline-none focus:border-amber-400 cursor-pointer"
              >
                {[10, 25, 50, 100].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            {/* Record Range */}
            <span className="text-xs font-semibold text-slate-500">
              {filteredRfqs.length === 0 ? '0 of 0' : `${startIndex + 1} to ${Math.min(startIndex + itemsPerPage, filteredRfqs.length)} of ${filteredRfqs.length.toLocaleString()}`}
            </span>

            {/* Page Info & Navigation */}
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-slate-500 mr-1">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 disabled:opacity-30 hover:bg-slate-100 transition-all cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 disabled:opacity-30 hover:bg-slate-100 transition-all cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 disabled:opacity-30 hover:bg-slate-100 transition-all cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(totalPages)}
                className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 disabled:opacity-30 hover:bg-slate-100 transition-all cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
        {/* Rebid Confirmation Modal */}
        {rebidConfirmation.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-scale-in space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-black text-slate-900">Rebid Project</h3>
                <p className="text-sm text-slate-500">
                  Are you sure you want to rebid for <strong className="text-slate-800">{rebidConfirmation.rfq?.project_name}</strong>?
                </p>
                <p className="text-xs text-slate-400 italic">
                  This will change the status to "Rebid" and load it in the estimation module.
                </p>
              </div>
              
              <div className="flex gap-3 justify-end font-semibold text-xs">
                <button
                  onClick={() => setRebidConfirmation({ isOpen: false, project: null, rfq: null })}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const { project, rfq } = rebidConfirmation;
                    setRebidConfirmation({ isOpen: false, project: null, rfq: null });
                    if (project) {
                      try {
                        const updatedProjectInfo = {
                          ...(project.estimation_data?.projectInfo || {}),
                          estimationStatus: 'rebid'
                        };
                        const payload = {
                          estimation_data: {
                            ...(project.estimation_data || {}),
                            projectInfo: updatedProjectInfo
                          }
                        };
                        await projectAPI.patch(project.id, payload);
                        setProjects(prev => prev.map(p => p.id === project.id ? { ...p, estimation_data: payload.estimation_data } : p));
                        toast.success('Status updated. Loading project for rebid...');
                        handleLoadProjectInModel({ ...project, estimation_data: payload.estimation_data }, rfq);
                      } catch (err) {
                        console.error('Failed to update status for rebid:', err);
                        toast.error('Failed to update status for rebid.');
                      }
                    }
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition-all cursor-pointer font-bold"
                >
                  Yes, Rebid
                </button>
              </div>
            </div>
          </div>
        )}
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
