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
  Sparkles
} from 'lucide-react';

export default function EstimationSummary({ isEmbedded = false, onEditSection }) {
  const navigate = useNavigate();

  // --- Load localStorage values ---
  const projectInfo = JSON.parse(localStorage.getItem('sfe_est_project') || '{}');
  const bidEnquiry = JSON.parse(localStorage.getItem('sfe_est_bid_enquiry') || '{}');
  const estimationSections = JSON.parse(localStorage.getItem('sfe_est_sections') || '{}');

  // --- Calculations mirroring EstimationModel ---
  const millWeightVal = Number(bidEnquiry.millWeight) || 0;
  const millAmountVal = Number(bidEnquiry.millAmount) || 0;
  const millTons = millWeightVal / 2000;

  const warehouseWeightVal = Number(bidEnquiry.warehouseWeight) || 0;
  const warehouseAmountVal = Number(bidEnquiry.warehouseAmount) || 0;
  const warehouseTons = warehouseWeightVal / 2000;

  const totalTons = millTons + warehouseTons;

  const scrapPercentVal = Number(bidEnquiry.scrapPercent) !== undefined && bidEnquiry.scrapPercent !== '' ? Number(bidEnquiry.scrapPercent) : 5.0;
  const scrapAmount = (millAmountVal + warehouseAmountVal) * scrapPercentVal / 100;

  const boltQtyVal = Number(bidEnquiry.boltQty) || 0;
  const boltRateVal = Number(bidEnquiry.boltRate) !== undefined && bidEnquiry.boltRate !== '' ? Number(bidEnquiry.boltRate) : 1.75;
  const boltAmount = boltQtyVal * boltRateVal;

  const paintQtyVal = Number(bidEnquiry.paintQty) || 0;
  const paintRateVal = Number(bidEnquiry.paintRate) !== undefined && bidEnquiry.paintRate !== '' ? Number(bidEnquiry.paintRate) : 22.20;
  const paintAmount = paintQtyVal * paintRateVal;

  const galvanizingWeightVal = Number(bidEnquiry.galvanizingWeight) || 0;
  const galvanizingRateVal = Number(bidEnquiry.galvanizingRate) !== undefined && bidEnquiry.galvanizingRate !== '' ? Number(bidEnquiry.galvanizingRate) : 0.40;
  const adjustedGalvanizedWeight = galvanizingWeightVal * 1.05;
  const galvanizingAmount = adjustedGalvanizedWeight * galvanizingRateVal;

  const miscSubtotal = Array.isArray(bidEnquiry.miscItems) 
    ? bidEnquiry.miscItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
    : 0;

  const totalMaterialDirectCosts = millAmountVal + warehouseAmountVal + scrapAmount + boltAmount + paintAmount + galvanizingAmount + miscSubtotal;
  const taxPercentVal = Number(bidEnquiry.taxPercent) !== undefined && bidEnquiry.taxPercent !== '' ? Number(bidEnquiry.taxPercent) : 6.0;
  const materialUseTaxAmount = totalMaterialDirectCosts * (taxPercentVal / 100);
  const totalMaterialCost = totalMaterialDirectCosts + materialUseTaxAmount;

  const plantFabricationHoursVal = Number(estimationSections.plantFabricationHours) || 0;
  const miscLaborHoursVal = Number(estimationSections.miscLaborHours) || 0;
  const miscLaborOtherHoursVal = Number(estimationSections.miscLaborOtherHours) || 0;
  const miscLaborOther2HoursVal = Number(estimationSections.miscLaborOther2Hours) || 0;
  const totalLaborHours = plantFabricationHoursVal + miscLaborHoursVal + miscLaborOtherHoursVal + miscLaborOther2HoursVal;
  const hourlyLaborRateVal = Number(estimationSections.hourlyLaborRate) !== undefined && estimationSections.hourlyLaborRate !== '' ? Number(estimationSections.hourlyLaborRate) : 60.0;
  const totalDirectplantCost = totalLaborHours * hourlyLaborRateVal;

  const numTrucksVal = Number(estimationSections.numTrucks) !== undefined && estimationSections.numTrucks !== '' ? Number(estimationSections.numTrucks) : 3;
  const hoursPerTruckVal = Number(estimationSections.hoursPerTruck) !== undefined && estimationSections.hoursPerTruck !== '' ? Number(estimationSections.hoursPerTruck) : 3;
  const galvanizingTrucksVal = Number(estimationSections.galvanizingTrucks) !== undefined && estimationSections.galvanizingTrucks !== '' ? Number(estimationSections.galvanizingTrucks) : 5;
  const galvHoursPerTruckVal = Number(estimationSections.galvHoursPerTruck) !== undefined && estimationSections.galvHoursPerTruck !== '' ? Number(estimationSections.galvHoursPerTruck) : 5.0;
  const shippingRateVal = Number(estimationSections.shippingRate) !== undefined && estimationSections.shippingRate !== '' ? Number(estimationSections.shippingRate) : 195.0;

  const freightOutCost = numTrucksVal * hoursPerTruckVal;
  const freightGalvanizingCost = galvanizingTrucksVal * galvHoursPerTruckVal;
  const totalShippingHours = freightOutCost + freightGalvanizingCost;
  const totalShippingCost = totalShippingHours * shippingRateVal;

  const subletDetailingCostVal = Number(estimationSections.subletDetailingCost) || 0;
  const peStampCostVal = Number(estimationSections.peStampCost) || 0;
  const otherDirectCostsVal = Number(estimationSections.otherDirectCosts) || 0;
  const totalDirectDraftingCost = subletDetailingCostVal + peStampCostVal;

  const totalDirectCosts = totalMaterialCost + totalDirectplantCost + totalShippingCost + totalDirectDraftingCost + otherDirectCostsVal;

  const overheadPercentVal = Number(estimationSections.overheadPercent) !== undefined && estimationSections.overheadPercent !== '' ? Number(estimationSections.overheadPercent) : 12.0;
  const directCostOverhead = Math.round(totalDirectCosts * (overheadPercentVal / 100) * 100) / 100;
  const bidAmountOnDirectCosts = Math.round(totalDirectCosts) + directCostOverhead;

  const steelJoistCostVal = Number(estimationSections.steelJoistCost) || 0;
  const deckCostVal = Number(estimationSections.deckCost) || 0;
  const subletErectionCostVal = Number(estimationSections.subletErectionCost) || 0;
  const miscMetalCostVal = Number(estimationSections.miscMetalCost) || 0;
  const oshaLinearFeetVal = Number(estimationSections.oshaLinearFeet) || 0;
  const oshaPostsCost = (oshaLinearFeetVal / 5) * 50;
  const additionalSafetyCostsVal = Number(estimationSections.additionalSafetyCosts) || 0;
  const ccipCostsVal = Number(estimationSections.ccipCosts) || 0;
  const safetyCost = additionalSafetyCostsVal + ccipCostsVal;
  const leedSubmissionCostVal = Number(estimationSections.leedSubmissionCost) || 0;
  const suppliedMaterialCostVal = Number(estimationSections.suppliedMaterialCost) || 0;
  const useTaxPercentVal = Number(estimationSections.useTaxPercent) !== undefined && estimationSections.useTaxPercent !== '' ? Number(estimationSections.useTaxPercent) : 6.0;

  const totalDirectBuyoutCosts = steelJoistCostVal + deckCostVal + subletErectionCostVal + miscMetalCostVal + oshaPostsCost + safetyCost + leedSubmissionCostVal;
  const useTax = suppliedMaterialCostVal * (useTaxPercentVal / 100);
  const totalBuyoutCosts = totalDirectBuyoutCosts + useTax;

  const buyoutOverheadPercentVal = Number(estimationSections.buyoutOverheadPercent) !== undefined && estimationSections.buyoutOverheadPercent !== '' ? Number(estimationSections.buyoutOverheadPercent) : 12.0;
  const buyoutOverhead = Math.round(totalBuyoutCosts) * (buyoutOverheadPercentVal / 100);
  const bidAmountOnBuyouts = Math.round(totalBuyoutCosts) + buyoutOverhead;

  const profitPercentVal = Number(estimationSections.profitPercent) !== undefined && estimationSections.profitPercent !== '' ? Number(estimationSections.profitPercent) : 10.0;
  const miscChargesVal = Number(estimationSections.miscCharges) || 0;

  const totalAmountBeforeProfit = Math.round(bidAmountOnDirectCosts) + Math.round(bidAmountOnBuyouts);
  const profitAmount = totalAmountBeforeProfit * (profitPercentVal / 100);
  const finalAmountBeforeMisc = totalAmountBeforeProfit + profitAmount;
  const finalBidAmount = finalAmountBeforeMisc + miscChargesVal;

  // --- miscellaneous Calculations ---
  const miscellaneousLaborRateVal = Number(estimationSections.miscellaneousLaborRate) !== undefined && estimationSections.miscellaneousLaborRate !== '' ? Number(estimationSections.miscellaneousLaborRate) : 85.0;
  const miscellaneousErectionMultiplierVal = Number(estimationSections.miscellaneousErectionMultiplier) !== undefined && estimationSections.miscellaneousErectionMultiplier !== '' ? Number(estimationSections.miscellaneousErectionMultiplier) : 1.12;
  const miscellaneousJoistDeckMultiplierVal = Number(estimationSections.miscellaneousJoistDeckMultiplier) !== undefined && estimationSections.miscellaneousJoistDeckMultiplier !== '' ? Number(estimationSections.miscellaneousJoistDeckMultiplier) : 1.12;
  const miscellaneousOtherCostMultiplierVal = Number(estimationSections.miscellaneousOtherCostMultiplier) !== undefined && estimationSections.miscellaneousOtherCostMultiplier !== '' ? Number(estimationSections.miscellaneousOtherCostMultiplier) : 1.12;

  const miscellaneousLaborCost = totalLaborHours * miscellaneousLaborRateVal;
  const miscellaneousMaterialTotal = totalMaterialCost;
  const miscellaneousTruckingTotal = totalShippingCost;
  const miscellaneousDetailingEngineeringTotal = totalDirectDraftingCost;
  const miscellaneousSubTotal = miscellaneousLaborCost + miscellaneousMaterialTotal + miscellaneousTruckingTotal + miscellaneousDetailingEngineeringTotal;

  const miscellaneousErectionTotal = subletErectionCostVal * miscellaneousErectionMultiplierVal;

  const miscellaneousJoistDeckCost = steelJoistCostVal + deckCostVal;
  const taxMultiplier = 1 + useTaxPercentVal / 100;
  const miscellaneousJoistDeckTotal = (miscellaneousJoistDeckCost * taxMultiplier) * miscellaneousJoistDeckMultiplierVal;

  const miscellaneousOtherCostsSum = miscMetalCostVal + safetyCost + leedSubmissionCostVal;
  const miscellaneousOtherCostsTotal = miscellaneousOtherCostsSum * miscellaneousOtherCostMultiplierVal;

  const miscellaneousTotalBeforeProfit = miscellaneousSubTotal + miscellaneousErectionTotal + miscellaneousJoistDeckTotal + miscellaneousOtherCostsTotal;
  const miscellaneousProfitAmount = miscellaneousTotalBeforeProfit * (profitPercentVal / 100);
  const miscellaneousMiscellaneousTotal = miscChargesVal;
  const miscellaneousFinalPrice = miscellaneousTotalBeforeProfit + miscellaneousProfitAmount + miscellaneousMiscellaneousTotal;

  const handleEditSection = (sectionKey) => {
    if (isEmbedded && onEditSection) {
      onEditSection(sectionKey);
    } else {
      navigate(`/estimation?section=${sectionKey}`);
    }
  };

  const hasTons = totalTons > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-2 animate-fade-in">
      {/* Header Area */}
      {!isEmbedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Estimation Totals Dashboard</h2>
            <p className="text-xs text-slate-500 mt-1">
              Visual summary and KPI analysis of all 8 bid estimation sections.
            </p>
          </div>
          <button
            onClick={() => navigate('/estimation')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-orange-500/10 hover:shadow-orange-500/20 transition-all cursor-pointer"
          >
            <Calculator className="w-4 h-4" />
            Edit Model Inputs
          </button>
        </div>
      )}

      {/* Active Project Details Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Active Project</span>
          <h3 className="text-lg font-black text-slate-800 mt-1">
            {projectInfo.project ? `#${projectInfo.quoteNum || 'SFE'}-${projectInfo.project}` : 'No project selected'}
          </h3>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 mt-2 text-xs text-slate-500 font-medium">
            {projectInfo.location && <span>Location: <strong className="text-slate-700">{projectInfo.location}</strong></span>}
            {projectInfo.date && <span>Date: <strong className="text-slate-700">{projectInfo.date}</strong></span>}
            {projectInfo.salesman && <span>Salesman: <strong className="text-slate-700">{projectInfo.salesman}</strong></span>}
          </div>
        </div>
        <div className="flex items-center gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl w-full md:w-auto justify-between md:justify-start">
          <div className="text-right">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Estimation Weight</span>
            <span className="text-base font-black text-slate-800">
              {totalTons.toFixed(3)} <span className="text-xs font-bold text-slate-500">Tons</span>
            </span>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-right">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Total Labor Hours</span>
            <span className="text-base font-black text-slate-800">
              {totalLaborHours} <span className="text-xs font-bold text-slate-500">Hrs</span>
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
              <span className="text-[10px] font-black text-amber-400/90 uppercase tracking-widest block">Standard Grand Total</span>
              <h4 className="text-3xl font-black mt-2 tracking-tight">
                ${finalBidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
              <p className="text-xs text-slate-350 mt-1 font-semibold">
                Per Ton Rate: ${hasTons ? (finalBidAmount / totalTons).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} /Ton
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
                ${miscellaneousFinalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
              <p className="text-xs text-amber-50 mt-1 font-semibold">
                Per Ton Rate: ${hasTons ? (miscellaneousFinalPrice / totalTons).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} /Ton
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
                  ${totalMaterialCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h4>
                <p className="text-[10.5px] font-semibold text-slate-400">
                  ${hasTons ? (totalMaterialCost / totalTons).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} /Ton
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
                  ${(totalDirectplantCost + totalShippingCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h4>
                <p className="text-[10.5px] font-semibold text-slate-400">
                  ${hasTons ? ((totalDirectplantCost + totalShippingCost) / totalTons).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} /Ton
                </p>
              </div>
              <div className="bg-green-50 p-2.5 rounded-xl text-green-600 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 italic">{totalLaborHours} Hrs + Freight</span>
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
                  ${(totalDirectDraftingCost + otherDirectCostsVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h4>
                <p className="text-[10.5px] font-semibold text-slate-400">
                  ${hasTons ? ((totalDirectDraftingCost + otherDirectCostsVal) / totalTons).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} /Ton
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
                  ${directCostOverhead.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h4>
                <p className="text-[10.5px] font-semibold text-slate-400">
                  ${hasTons ? (directCostOverhead / totalTons).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} /Ton
                </p>
              </div>
              <div className="bg-purple-50 p-2.5 rounded-xl text-purple-600 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 italic">Rate: {overheadPercentVal}%</span>
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
                  ${totalBuyoutCosts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h4>
                <p className="text-[10.5px] font-semibold text-slate-400">
                  ${hasTons ? (totalBuyoutCosts / totalTons).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} /Ton
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
                  ${buyoutOverhead.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h4>
                <p className="text-[10.5px] font-semibold text-slate-400">
                  ${hasTons ? (buyoutOverhead / totalTons).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} /Ton
                </p>
              </div>
              <div className="bg-pink-50 p-2.5 rounded-xl text-pink-600 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 italic">Rate: {buyoutOverheadPercentVal}%</span>
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
                  ${(profitAmount + miscChargesVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h4>
                <p className="text-[10.5px] font-semibold text-slate-400">
                  ${hasTons ? ((profitAmount + miscChargesVal) / totalTons).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'} /Ton
                </p>
              </div>
              <div className="bg-orange-50 p-2.5 rounded-xl text-orange-600 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 italic">{profitPercentVal}% Profit + Misc Charges</span>
              <button
                onClick={() => handleEditSection('finalTotals')}
                className="text-orange-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform cursor-pointer"
              >
                Edit inputs
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
