"""
EstimateData / Cost Code generation service — Sheet 7.

Computes all 14 cost codes from cross-module data.

Traceability:
  EST-001: 4.01 Draft Labor = draft_lbs * $21
  EST-002: 4.02 Draft Subcontract = draft_sub_amount
  EST-003: 1.01 Shop Labor = (MiscMet.shop_hrs + BidSum.shop_fab_hrs) * $21
  EST-004: 1.02 Shop Subcontract = MiscMet.subcontract_total
  EST-005: 1.03 Steel Material = (MiscMet.mat_lbs + Mill_lbs + Whse_lbs) * 1.06
  EST-006: 1.05 Grating Material = MiscMet.grating_value
  EST-007: 1.06 Joist Material = BidSummary.joist_total  [GAP-001]
  EST-008: 1.07 Deck Material = BidSummary.deck_total    [GAP-001]
  EST-009: 1.08 Other Material = MiscMet.other + BidSum.misc_total
  EST-010: 1.09 Anodizing = MiscMet.anodizing_value
  EST-011: 1.10 Galvanizing = (MiscMet.galv_lbs + BidSum.galv_lbs) * rate
  EST-012: 1.11 Paint Supply = BidSum.paint_total
  EST-013: 1.12 Bolts Supply = BidSum.bolts_total
  EST-014: 2.01 Field Labor = (MiscMet.field_hrs + EreTakeoff.total_iw_hrs) * $21
"""
from decimal import Decimal


def compute_cost_codes(project):
    """
    Generate all 16 cost codes for a project.
    Returns ordered list of {code, description, amount} dicts.
    """
    from apps.bid_summary.services import compute_bid_summary_totals
    from apps.erection_takeoff.services import compute_erection_totals
    from apps.misc_metals.services import compute_misc_metals_totals

    rate_config = project.rate_config
    labor_rate = Decimal(str(rate_config.cost_code_labor_rate))  # default $21

    # --- Bid Summary ---
    try:
        bid = project.bid_summary
        bid_totals = compute_bid_summary_totals(bid, rate_config)
        mill_lbs = Decimal(str(bid.mill_steel_lbs or 0))
        whse_lbs = Decimal(str(bid.warehouse_steel_lbs or 0))
        mill_total = Decimal(str(bid_totals.get("mill_total", 0)))
        whse_total = Decimal(str(bid_totals.get("warehouse_total", 0)))
        galv_lbs_bid = Decimal(str(bid.galv_lbs or 0))
        galv_cost_bid = Decimal(str(bid_totals.get("galv_total", 0)))
        paint_total = Decimal(str(bid_totals.get("paint_total", 0)))
        bolts_total = Decimal(str(bid_totals.get("bolts_total", 0)))
        misc_lines_total = Decimal(str(bid_totals.get("misc_lines_total", 0)))
        joist_total = Decimal(str(bid.joist_total or 0))
        deck_total = Decimal(str(bid.deck_total or 0))
        shop_fab_hrs = Decimal(str(bid.shop_fab_hrs or 0))
        total_shop_hrs = Decimal(str(bid_totals.get("total_shop_hrs", 0)))
        draft_lbs = Decimal(str(bid.draft_lbs or 0))
        draft_sub = Decimal(str(bid.draft_sub_amount or 0))
        shop_subcontract = Decimal(str(bid.shop_subcontract_total or 0))
        total_structural_tons = Decimal(str(bid_totals.get("total_structural_tons", 0)))
        total_shipping_cost = Decimal(str(bid_totals.get("total_shipping_cost", 0)))
    except Exception:
        mill_lbs = whse_lbs = galv_lbs_bid = paint_total = bolts_total = Decimal(0)
        mill_total = whse_total = galv_cost_bid = Decimal(0)
        misc_lines_total = joist_total = deck_total = shop_fab_hrs = total_shop_hrs = Decimal(0)
        draft_lbs = draft_sub = shop_subcontract = total_structural_tons = total_shipping_cost = Decimal(0)

    # --- Erection Takeoff ---
    try:
        ert = project.erection_takeoff
        ert_totals = compute_erection_totals(ert, rate_config, project.bid_summary)
        total_iw_hours = Decimal(str(ert_totals.get("total_raw_hours", 0)))
        equipment_rental = Decimal(str(ert.equipment_rental or 0))
    except Exception:
        total_iw_hours = Decimal(0)
        equipment_rental = Decimal(0)

    # --- Misc Metals ---
    try:
        misc = project.misc_metals_estimate
        misc_totals = compute_misc_totals = compute_misc_metals_totals(misc, rate_config)
        misc_shop_hrs = Decimal(str(misc_totals.get("total_shop_hrs", 0)))
        misc_field_hrs = Decimal(str(misc_totals.get("total_field_hrs", 0)))
        misc_subcontract = Decimal(str(misc_totals.get("total_subcontract", 0)))
        grating_value = Decimal(str(misc_totals.get("grating_value", 0)))
        anodizing_value = Decimal(str(misc_totals.get("anodizing_value", 0)))
        galv_lbs_misc = Decimal(str(misc_totals.get("galv_lbs", 0)))
        galv_cost_misc = Decimal(str(misc_totals.get("galv_cost", 0)))
        other_value = Decimal(str(misc_totals.get("other_value", 0)))
        misc_material_total = Decimal(str(misc_totals.get("total_material", 0)))
        misc_mesh_subcontract = Decimal(str(misc_totals.get("total_mesh_subcontract", 0)))
        misc_weight_lbs = Decimal(str(misc_totals.get("total_weight_lbs", 0)))
    except Exception:
        misc_shop_hrs = misc_field_hrs = misc_subcontract = Decimal(0)
        grating_value = anodizing_value = galv_lbs_misc = galv_cost_misc = other_value = Decimal(0)
        misc_material_total = Decimal(0)
        misc_mesh_subcontract = Decimal(0)
        misc_weight_lbs = Decimal(0)

    # --- Cost Code Calculations ---
    galv_rate = Decimal(str(rate_config.galv_unit_price))  # $0.40/lb
    overrides = (project.estimation_data or {}).get("costCodeOverrides", {})

    def get_amount(code, default_val):
        if code in overrides and overrides[code] is not None:
            try:
                return round(float(overrides[code]), 2)
            except (ValueError, TypeError):
                pass
        return round(float(default_val), 2)

    codes = [
        {
            "code": "4.01",
            "description": "Draft Labor",
            "amount": get_amount("4.01", total_structural_tons * labor_rate),
        },
        {
            "code": "4.02",
            "description": "Draft Subcontract",
            "amount": get_amount("4.02", draft_sub),
        },
        {
            "code": "1.01",
            "description": "Shop Labor",
            "amount": get_amount("1.01", (misc_shop_hrs + total_shop_hrs) * labor_rate),
        },
        {
            "code": "1.02",
            "description": "Shop Subcontract",
            "amount": get_amount("1.02", misc_subcontract + shop_subcontract + misc_mesh_subcontract),
        },
        {
            "code": "1.03",
            "description": "Steel Material",
            "amount": get_amount("1.03", (misc_material_total + mill_total + whse_total) * Decimal("1.06")),
        },
        {
            "code": "1.05",
            "description": "Grating Material",
            "amount": get_amount("1.05", grating_value),
        },
        {
            "code": "1.06",
            "description": "Joist Material",
            "amount": get_amount("1.06", joist_total),
        },
        {
            "code": "1.07",
            "description": "Deck Material",
            "amount": get_amount("1.07", deck_total),
        },
        {
            "code": "1.08",
            "description": "Other Material",
            "amount": get_amount("1.08", other_value + misc_lines_total),
        },
        {
            "code": "1.09",
            "description": "Anodizing Finish",
            "amount": get_amount("1.09", anodizing_value),
        },
        {
            "code": "1.10",
            "description": "Galvanizing",
            "amount": get_amount("1.10", galv_cost_misc + galv_cost_bid),
        },
        {
            "code": "1.11",
            "description": "Paint Supply",
            "amount": get_amount("1.11", paint_total),
        },
        {
            "code": "1.12",
            "description": "Bolts Supply",
            "amount": get_amount("1.12", bolts_total),
        },
        {
            "code": "1.13",
            "description": "Freight In & Out - Misc",
            "amount": get_amount("1.13", Decimal("0.00")),
        },
        {
            "code": "2.01",
            "description": "Field Labor",
            "amount": get_amount("2.01", (misc_field_hrs + total_iw_hours) * labor_rate),
        },
        {
            "code": "2.05",
            "description": "Equipment Rental",
            "amount": get_amount("2.05", equipment_rental),
        },
    ]

    grand_total = sum(c["amount"] for c in codes)
    
    # Calculate Total Hours (row 36 in Excel): C6 + C10 + C24 + C29
    # C6 = total_structural_tons
    # C10 = misc_shop_hrs + total_shop_hrs
    # C24 = 0.00
    # C29 = misc_field_hrs + total_iw_hours
    total_hours = total_structural_tons + (misc_shop_hrs + total_shop_hrs) + (misc_field_hrs + total_iw_hours)

    # Calculate Total Weight (row 37 in Excel): C13 + C21
    # C13 = misc_weight_lbs + mill_lbs + whse_lbs
    # C21 = galv_lbs_misc + galv_lbs_bid * 1.05
    galv_lbs_bid_with_waste = galv_lbs_bid * Decimal("1.05")
    total_weight = (misc_weight_lbs + mill_lbs + whse_lbs) + (galv_lbs_misc + galv_lbs_bid_with_waste)

    res = {
        "cost_codes": codes,
        "grand_total": round(grand_total, 2),
        "total_hours": round(float(total_hours), 2),
        "total_weight": round(float(total_weight), 2),
    }

    # Map code strings to friendly key names for the frontend
    key_mapping = {
        "4.01": "draft_labor",
        "4.02": "draft_subcontract",
        "1.01": "shop_labor",
        "1.02": "shop_subcontract",
        "1.03": "steel_material",
        "1.05": "grating_material",
        "1.06": "joist_material",
        "1.07": "deck_material",
        "1.08": "other_material",
        "1.09": "anodizing_finish",
        "1.10": "galvanizing",
        "1.11": "paint_supply",
        "1.12": "bolts_supply",
        "2.01": "field_labor",
    }
    for code_item in codes:
        key = key_mapping.get(code_item["code"])
        if key:
            res[key] = code_item["amount"]

    return res
