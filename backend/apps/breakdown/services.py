"""
Breakdown service — cross-module aggregation (Sheet 6).

BRK-001: Assembled at query time from related models — no DB queries to a breakdown table.
BRK-002: Structural Steel row: tons, shop hrs, field hrs, value
BRK-003: value = (shop_hrs + field_hrs) * $60 + use_tax
BRK-004: One row per MiscMetalsItem / StairFlight
BRK-005: Galvanizing flag per row
"""
from decimal import Decimal


def assemble_breakdown(project):
    """
    Assemble the full breakdown from all estimate modules.
    Returns a dict with structural_steel row and misc_metals rows.
    """
    from apps.bid_summary.services import compute_bid_summary_totals
    from apps.erection_takeoff.services import compute_erection_totals
    from apps.misc_metals.services import compute_misc_metals_totals, compute_stair_flight, compute_misc_item

    rate_config = project.rate_config

    # Pull bid summary
    try:
        bid = project.bid_summary
        bid_totals = compute_bid_summary_totals(bid, rate_config)
    except Exception:
        bid_totals = {}

    # Pull erection takeoff
    try:
        ert = project.erection_takeoff
        ert_totals = compute_erection_totals(ert, rate_config, project.bid_summary)
    except Exception:
        ert_totals = {}

    # Structural steel row (BRK-002)
    # Shop Hrs = Bid Summary Total Shop Hours + Erection Take-Off foreman_hours / 8
    # Field Hrs = 0.0 (matches Excel H5 = 0)
    shop_hrs = float(bid_totals.get("total_shop_hrs", 0)) + float(ert_totals.get("foreman_hours", 0)) / 8.0
    field_hrs = 0.0
    structural_tons = float(bid_totals.get("total_structural_tons", 0))
    direct_material = float(bid_totals.get("total_direct_material", 0))
    use_tax = float(bid_totals.get("use_tax", 0))

    # BRK-003: value = (shop + field) * breakdown_rate + direct_material + use_tax
    breakdown_rate = float(rate_config.shop_labor_rate)
    structural_value = round((shop_hrs + field_hrs) * breakdown_rate + direct_material + use_tax, 2)

    structural_row = {
        "item_ref": "structural_steel",
        "description": "Structural Steel",
        "label": "Structural Steel",
        "qty_tons": round(structural_tons, 3),
        "weight_tons": round(structural_tons, 3),
        "shop_hrs": round(shop_hrs, 2),
        "field_hrs": round(field_hrs, 2),
        "value": structural_value,
        "is_galvanized": False,
    }

    # Misc metals rows (BRK-004)
    misc_rows = []
    try:
        misc = project.misc_metals_estimate
        for stair in misc.stair_flights.all():
            row_data = compute_stair_flight(stair, rate_config)
            misc_rows.append({
                "item_ref": f"stair_{stair.id}",
                "description": stair.description or stair.get_stair_type_display(),
                "label": stair.description or stair.get_stair_type_display(),
                "qty_tons": None,
                "weight_tons": None,
                "shop_hrs": row_data["sl_hrs"],
                "field_hrs": row_data["fl_hrs"],
                "value": row_data["total"],
                "is_galvanized": False,
            })
        for item in misc.items.all():
            row_data = compute_misc_item(item)
            qty = Decimal(str(item.quantity or 0))
            
            # Compute value including labor, material and finish/subcontract
            if item.is_subcontract:
                item_value = float(Decimal(str(item.subcontract_amount or 0)).quantize(Decimal("0.01")))
            else:
                # Special finishes cost
                finish_cost = Decimal("0")
                if item.is_galvanized:
                    desc = item.description.lower()
                    if "picket" in desc:
                        item_galv_rate = Decimal("0.50")
                    elif "bollard" in desc or "lintel" in desc:
                        item_galv_rate = Decimal("0.30")
                    elif "ladder" in desc or "wallrail" in desc or "1-line" in desc or "2-line" in desc or "3-line" in desc:
                        item_galv_rate = Decimal("0.70")
                    else:
                        item_galv_rate = Decimal(str(rate_config.galv_unit_price))
                    
                    item_w = qty * Decimal(str(item.unit_weight or 0))
                    finish_cost = (item_w * Decimal("1.05") * item_galv_rate).quantize(Decimal("0.01"))
                elif item.is_anodized:
                    finish_cost = (qty * Decimal("7.31")).quantize(Decimal("0.01"))
                elif item.is_powder_coated:
                    finish_cost = (qty * Decimal("5.20")).quantize(Decimal("0.01"))
                elif item.category == "grating" or "grating" in item.description.lower() or "sump pit" in item.description.lower():
                    finish_cost = (qty * Decimal("60.00")).quantize(Decimal("0.01"))

                sl_hrs = Decimal(str(row_data["sl_hrs"]))
                # Nosing shop hours override
                if "nosing" in item.description.lower() and qty > 0:
                    sl_hrs = Decimal("1.0")

                fl_hrs = Decimal(str(row_data["fl_hrs"]))
                mat_val = Decimal(str(row_data["material_value"]))
                
                # Value = (shop + field) * shop_labor_rate + material_cost + finish_cost
                item_value = float(((sl_hrs + fl_hrs) * Decimal(str(rate_config.shop_labor_rate)) + mat_val + finish_cost).quantize(Decimal("0.01")))

            misc_rows.append({
                "item_ref": f"misc_{item.id}",
                "description": item.description,
                "label": item.description,
                "qty_tons": None,
                "weight_tons": None,
                "shop_hrs": row_data["sl_hrs"],
                "field_hrs": row_data["fl_hrs"],
                "value": item_value,
                "is_galvanized": item.is_galvanized,
            })
    except Exception:
        pass

    # Attach annotations
    annotations = {
        ann.item_ref: {
            "detailer": ann.detailer,
            "mat_ordered": ann.mat_ordered,
            "erected": ann.erected,
            "notes": ann.notes,
        }
        for ann in project.breakdown_annotations.all()
    }

    all_rows = [structural_row] + misc_rows
    for row in all_rows:
        ann = annotations.get(row["item_ref"], {})
        row["annotation"] = ann

    return {
        "rows": all_rows,
        "summary": {
            "total_shop_hrs": round(sum(r["shop_hrs"] for r in all_rows), 2),
            "total_field_hrs": round(sum(r["field_hrs"] for r in all_rows), 2),
            "total_value": round(sum(r["value"] for r in all_rows), 2),
        },
    }
