"""
Bid Summary business logic service.

All formulas are implemented here as pure Python functions for testability.
These are called from serializers — never computed in the database.

Traceability:
  BID-001: lbs_to_tons
  BID-002: lbs_to_tons
  BID-003: scrap_credit
  BID-008: total_direct_material
  BID-009: use_tax
  BID-010: shop_labor_cost
  BID-011: mh_per_ton
  BID-014: price_per_lb (guard division by zero)
"""
from decimal import Decimal, ROUND_HALF_UP


def lbs_to_tons(lbs: Decimal) -> Decimal:
    """Convert pounds to short tons. BID-001/BID-002: tons = lbs / 2000."""
    if not lbs:
        return Decimal("0")
    return (Decimal(str(lbs)) / Decimal("2000")).quantize(Decimal("0.000"), rounding=ROUND_HALF_UP)


def price_per_lb(total: Decimal, lbs: Decimal) -> Decimal:
    """Guard division by zero. BID-014: if lbs < 1 return 0."""
    if not lbs or Decimal(str(lbs)) < Decimal("1"):
        return Decimal("0")
    return (Decimal(str(total)) / Decimal(str(lbs))).quantize(Decimal("0.000000"), rounding=ROUND_HALF_UP)


def scrap_credit(mill_total: Decimal, warehouse_total: Decimal, rate: Decimal) -> Decimal:
    """BID-003: scrap_credit = (mill_total + warehouse_total) * rate (default 5%)."""
    total_cost = Decimal(str(mill_total or 0)) + Decimal(str(warehouse_total or 0))
    return (total_cost * Decimal(str(rate or "0.05"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def use_tax(total_direct_cost: Decimal, tax_rate: Decimal) -> Decimal:
    """BID-009: use_tax = total_direct_cost * tax_rate."""
    return (Decimal(str(total_direct_cost or 0)) * Decimal(str(tax_rate or 0))).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )


def shop_labor_cost(shop_fab_hrs: Decimal, shop_labor_rate: Decimal) -> Decimal:
    """BID-010: shop_labor_cost = hours * rate."""
    return (Decimal(str(shop_fab_hrs or 0)) * Decimal(str(shop_labor_rate or 0))).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )


def mh_per_ton(total_shop_hrs: Decimal, total_tons: Decimal) -> Decimal:
    """BID-011: mh_per_ton = total_shop_hrs / total_tons. Guard zero."""
    if not total_tons or Decimal(str(total_tons)) == Decimal("0"):
        return Decimal("0")
    return (Decimal(str(total_shop_hrs or 0)) / Decimal(str(total_tons))).quantize(
        Decimal("0.00"), rounding=ROUND_HALF_UP
    )


def compute_bid_summary_totals(bid_summary, rate_config):
    """
    Compute all derived values for a BidSummary instance, matching the Excel sheet
    "Bid Summary" formulas for Column O (Overhead, Profit, Buyouts) and Column E (Alternate Billing).
    """
    # Core steel
    mill_tons = lbs_to_tons(bid_summary.mill_steel_lbs)
    warehouse_tons = lbs_to_tons(bid_summary.warehouse_steel_lbs)
    total_structural_tons = mill_tons + warehouse_tons

    mill_total = Decimal(str(bid_summary.mill_steel_total or 0)).quantize(Decimal("0.01"))
    warehouse_total = Decimal(str(bid_summary.warehouse_steel_total or 0)).quantize(Decimal("0.01"))

    # Scrap is calculated on steel cost, and added as a material loss cost
    scrap = scrap_credit(mill_total, warehouse_total, rate_config.scrap_rate)

    # Fixed materials
    bolts_total = (
        Decimal(str(bid_summary.bolt_pieces or 0))
        * Decimal(str(rate_config.bolt_unit_price))
    ).quantize(Decimal("0.01"))

    paint_total = (
        Decimal(str(bid_summary.paint_gallons or 0))
        * Decimal(str(rate_config.paint_unit_price))
    ).quantize(Decimal("0.01"))

    # Galvanizing adds a 5% waste factor to weight before applying rate
    galv_total = (
        Decimal(str(bid_summary.galv_lbs or 0))
        * Decimal("1.05")
        * Decimal(str(rate_config.galv_unit_price))
    ).quantize(Decimal("0.01"))

    # Misc material lines
    misc_lines_total = sum(
        Decimal(str(line.amount or 0))
        for line in bid_summary.material_lines.all()
    )

    # Total direct material (ex buyouts) - matches sum(M9:M21)
    direct_material_cost_ex_buyouts = (
        mill_total + warehouse_total + scrap
        + bolts_total + paint_total + galv_total
        + misc_lines_total
    ).quantize(Decimal("0.01"))

    # Use tax on direct materials (BID-009) - matches sum(D23)*O22
    use_tax_rate = Decimal(str(rate_config.use_tax_rate or 0))
    direct_material_use_tax = (direct_material_cost_ex_buyouts * use_tax_rate).quantize(Decimal("0.01"))

    # Shop labor
    shop_labor = shop_labor_cost(bid_summary.shop_fab_hrs, rate_config.shop_labor_rate)

    # Misc labor lines total
    labor_lines_total = sum(
        Decimal(str(line.hours or 0)) * Decimal(str(line.rate or 0))
        for line in bid_summary.labor_lines.all()
    )

    # Total shop hours (BID-013)
    misc_labor_hrs = sum(
        Decimal(str(line.hours or 0)) for line in bid_summary.labor_lines.all()
    )
    total_shop_hrs = Decimal(str(bid_summary.shop_fab_hrs or 0)) + misc_labor_hrs

    # Total Shop Cost = fabrication labor + custom labor lines
    total_direct_shop_cost = (shop_labor + labor_lines_total).quantize(Decimal("0.01"))

    # MH/Ton ratio (BID-011) - uses total shop hours
    mh_ton = mh_per_ton(total_shop_hrs, total_structural_tons)

    # Shipping/Freight Calculations
    freight_out_trucks = Decimal(str(bid_summary.freight_out_trucks or 0))
    freight_out_hours_each = Decimal(str(bid_summary.freight_out_hours_each or 0))
    freight_galv_trucks = Decimal(str(bid_summary.freight_galv_trucks or 0))
    freight_galv_hours_each = Decimal(str(bid_summary.freight_galv_hours_each or 0))

    freight_out_hrs = (freight_out_trucks * freight_out_hours_each).quantize(Decimal("0.01"))
    freight_galv_hrs = (freight_galv_trucks * freight_galv_hours_each).quantize(Decimal("0.01"))
    total_shipping_hrs = freight_out_hrs + freight_galv_hrs

    shipping_hourly_rate = Decimal(str(rate_config.shipping_hourly_rate or "195.00"))
    total_shipping_cost = (total_shipping_hrs * shipping_hourly_rate).quantize(Decimal("0.01"))

    # Drafting Calculations
    draft_sub = Decimal(str(bid_summary.draft_sub_amount or 0))
    pe_stamp_cost = Decimal(str(bid_summary.pe_stamp_cost or 0))
    total_direct_drafting_cost = (draft_sub + pe_stamp_cost).quantize(Decimal("0.01"))

    # Total Direct Costs (Row 39) = SUM(O22,O33,O23,O30,O38)
    total_direct_costs = (
        direct_material_cost_ex_buyouts
        + direct_material_use_tax
        + total_direct_shop_cost
        + total_shipping_cost
        + total_direct_drafting_cost
    ).quantize(Decimal("0.01"))

    # Overhead on Direct Costs (Row 42) = total_direct_costs * overhead_rate
    overhead_rate = Decimal(str(rate_config.overhead_rate or "0.12"))
    overhead_on_direct_costs = (total_direct_costs * overhead_rate).quantize(Decimal("0.01"))

    # Bid Amount on Direct Costs (Row 43) = total_direct_costs + overhead_on_direct_costs
    bid_amount_on_direct_costs = (total_direct_costs + overhead_on_direct_costs).quantize(Decimal("0.01"))

    # BUYOUTS
    joist_total = Decimal(str(bid_summary.joist_total or 0))
    deck_total = Decimal(str(bid_summary.deck_total or 0))
    joist_deck_total = (joist_total + deck_total).quantize(Decimal("0.01"))
    joist_deck_tons = Decimal(str(bid_summary.joist_deck_tons or 0))

    sublet_erection = Decimal(str(bid_summary.sublet_erection or 0))
    misc_metals = Decimal(str(bid_summary.misc_metals or 0))
    osha_posts_lf = Decimal(str(bid_summary.osha_posts_lf or 0))
    osha_posts_cost = ((osha_posts_lf / Decimal("5")) * Decimal("50")).quantize(Decimal("0.01"))
    safety_ccip = Decimal(str(bid_summary.safety_ccip or 0))
    leed_data = Decimal(str(bid_summary.leed_data or 0))

    # Total Direct Buyout Costs (Row 52) = SUM(M46:M51)
    total_direct_buyout_costs = (
        joist_deck_total
        + sublet_erection
        + misc_metals
        + osha_posts_cost
        + safety_ccip
        + leed_data
    ).quantize(Decimal("0.01"))

    # Buyout Use Tax (Row 53) = joist_deck_total * use_tax_rate
    buyout_use_tax = (joist_deck_total * use_tax_rate).quantize(Decimal("0.01"))

    # Total Buyout Costs (Row 54) = total_direct_buyout_costs + buyout_use_tax
    total_buyout_costs = (total_direct_buyout_costs + buyout_use_tax).quantize(Decimal("0.01"))

    # Overhead on Buyouts (Row 56) = total_buyout_costs * overhead_rate
    overhead_on_buyouts = (total_buyout_costs * overhead_rate).quantize(Decimal("0.01"))

    # Bid Amount on Buyouts (Row 57) = total_buyout_costs + overhead_on_buyouts
    bid_amount_on_buyouts = (total_buyout_costs + overhead_on_buyouts).quantize(Decimal("0.01"))

    # TOTAL AMOUNT (Row 58) = bid_amount_on_direct_costs + bid_amount_on_buyouts
    total_amount_before_profit = (bid_amount_on_direct_costs + bid_amount_on_buyouts).quantize(Decimal("0.01"))

    # PROFIT (Row 59) = total_amount_before_profit * profit_rate
    profit_rate = Decimal(str(rate_config.profit_rate or "0.10"))
    profit_amount = (total_amount_before_profit * profit_rate).quantize(Decimal("0.01"))

    # TOTAL AMOUNT (Row 60) = total_amount_before_profit + profit_amount
    total_amount_after_profit = (total_amount_before_profit + profit_amount).quantize(Decimal("0.01"))

    # Misc amount (Row 61)
    misc_bid_amount = Decimal(str(bid_summary.misc_bid_amount or 0)).quantize(Decimal("0.01"))

    # Final Bid Amount (Row 62) = total_amount_after_profit + misc_bid_amount
    final_bid_amount = (total_amount_after_profit + misc_bid_amount).quantize(Decimal("0.01"))

    # Calculated sublet erection rate per ton: H47 = M47 / (D36 + H46)
    denom_erection = total_structural_tons + joist_deck_tons
    sublet_erection_rate_per_ton = Decimal("0")
    if sublet_erection > 0 and denom_erection > 0:
        sublet_erection_rate_per_ton = (sublet_erection / denom_erection).quantize(Decimal("0.01"))

    # ALTERNATE BILLING BREAKDOWN (Column E, Rows 66-77)
    labor_billing_rate = Decimal(str(rate_config.labor_billing_rate or "85.00"))
    erection_markup = Decimal(str(rate_config.erection_markup or "1.12"))
    joist_deck_markup = Decimal(str(rate_config.joist_deck_markup or "1.12"))
    other_buyout_markup = Decimal(str(rate_config.other_buyout_markup or "1.12"))

    billing_labor_cost = (total_shop_hrs * labor_billing_rate).quantize(Decimal("0.01"))
    billing_material_cost = (direct_material_cost_ex_buyouts + direct_material_use_tax).quantize(Decimal("0.01"))
    billing_trucking_cost = total_shipping_cost
    billing_det_eng_cost = total_direct_drafting_cost

    # Sub-total (Row 70)
    billing_subtotal = (
        billing_labor_cost
        + billing_material_cost
        + billing_trucking_cost
        + billing_det_eng_cost
    ).quantize(Decimal("0.01"))

    # Erection markup
    billing_erection_cost = (sublet_erection * erection_markup).quantize(Decimal("0.01"))
    # Joist & Deck markup + Tax
    billing_joist_deck_cost = (joist_deck_total * (Decimal("1") + use_tax_rate) * joist_deck_markup).quantize(Decimal("0.01"))
    # Other markup
    billing_other_buyout_cost = (
        (misc_metals + osha_posts_cost + safety_ccip + leed_data) * other_buyout_markup
    ).quantize(Decimal("0.01"))

    # Total (Row 74)
    billing_total = (
        billing_subtotal
        + billing_erection_cost
        + billing_joist_deck_cost
        + billing_other_buyout_cost
    ).quantize(Decimal("0.01"))

    # Profit (Row 75)
    billing_profit_amount = (billing_total * profit_rate).quantize(Decimal("0.01"))
    # Misc (Row 76)
    billing_misc_cost = misc_bid_amount
    # Final Price (Row 77)
    billing_final_price = (billing_total + billing_profit_amount + billing_misc_cost).quantize(Decimal("0.01"))

    return {
        "mill_tons": mill_tons,
        "mill_total": mill_total,
        "mill_price_per_lb": price_per_lb(mill_total, bid_summary.mill_steel_lbs),
        "warehouse_tons": warehouse_tons,
        "warehouse_total": warehouse_total,
        "warehouse_price_per_lb": price_per_lb(warehouse_total, bid_summary.warehouse_steel_lbs),
        "total_structural_tons": total_structural_tons,
        "scrap_credit": scrap,
        "bolts_total": bolts_total,
        "paint_total": paint_total,
        "galv_total": galv_total,
        "misc_lines_total": misc_lines_total,
        "joist_total": joist_total,
        "deck_total": deck_total,
        "joist_deck_total": joist_deck_total,
        "direct_material_cost_ex_buyouts": direct_material_cost_ex_buyouts,
        "total_direct_material": direct_material_cost_ex_buyouts,
        "direct_material_use_tax": direct_material_use_tax,
        "use_tax": direct_material_use_tax,
        "shop_labor_cost": shop_labor,
        "labor_lines_total": labor_lines_total,
        "total_direct_shop_cost": total_direct_shop_cost,
        "total_shop_hrs": total_shop_hrs,
        "mh_per_ton": mh_ton,
        "freight_out_hrs": freight_out_hrs,
        "freight_galv_hrs": freight_galv_hrs,
        "total_shipping_hrs": total_shipping_hrs,
        "total_shipping_cost": total_shipping_cost,
        "draft_sub": draft_sub,
        "pe_stamp_cost": pe_stamp_cost,
        "total_direct_drafting_cost": total_direct_drafting_cost,
        "total_direct_costs": total_direct_costs,
        "overhead_on_direct_costs": overhead_on_direct_costs,
        "bid_amount_on_direct_costs": bid_amount_on_direct_costs,
        "osha_posts_cost": osha_posts_cost,
        "total_direct_buyout_costs": total_direct_buyout_costs,
        "buyout_use_tax": buyout_use_tax,
        "total_buyout_costs": total_buyout_costs,
        "overhead_on_buyouts": overhead_on_buyouts,
        "bid_amount_on_buyouts": bid_amount_on_buyouts,
        "total_amount_before_profit": total_amount_before_profit,
        "profit_amount": profit_amount,
        "total_amount_after_profit": total_amount_after_profit,
        "misc_bid_amount": misc_bid_amount,
        "final_bid_amount": final_bid_amount,
        "sublet_erection_rate_per_ton": sublet_erection_rate_per_ton,
        # billing alternate breakdown
        "billing_labor_cost": billing_labor_cost,
        "billing_material_cost": billing_material_cost,
        "billing_trucking_cost": billing_trucking_cost,
        "billing_det_eng_cost": billing_det_eng_cost,
        "billing_subtotal": billing_subtotal,
        "billing_erection_cost": billing_erection_cost,
        "billing_joist_deck_cost": billing_joist_deck_cost,
        "billing_other_buyout_cost": billing_other_buyout_cost,
        "billing_total": billing_total,
        "billing_profit_amount": billing_profit_amount,
        "billing_misc_cost": billing_misc_cost,
        "billing_final_price": billing_final_price,
        "grand_total": final_bid_amount,
    }
