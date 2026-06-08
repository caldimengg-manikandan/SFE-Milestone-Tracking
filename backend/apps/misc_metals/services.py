"""
Misc Metals business logic service.

Stair material rate formulas from Excel Sheet 5.
"""
from decimal import Decimal, ROUND_HALF_UP

# Labor rates (SL=shop hrs, FL=field hrs)
LABOR_RATES = {
    "riser_sl": Decimal("2.0"),
    "riser_fl": Decimal("1.0"),
    "picket_sl": Decimal("0.85"),
    "picket_fl": Decimal("0.40"),
    "grabrail_sl": Decimal("0.20"),
    "grabrail_fl": Decimal("0.20"),
    "wallrail_sl": Decimal("0.20"),
    "wallrail_fl": Decimal("0.10"),
    "landing_sl": Decimal("0.10"),
    "landing_fl": Decimal("0.10"),
    "mesh_sl": Decimal("0.50"),
    "mesh_fl": Decimal("0.40"),
}


def stair_material_lbs(
    stair_type: str,
    num_risers: int,
    qty: int,
    lf_picket: Decimal = Decimal("0"),
    lf_mesh: Decimal = Decimal("0"),
    lf_grabrail: Decimal = Decimal("0"),
    lf_wallrail: Decimal = Decimal("0"),
    num_landings: Decimal = Decimal("0"),
) -> Decimal:
    """
    Compute raw material lbs for a stair flight, summing all components.
    """
    risers = Decimal(str(num_risers or 0))
    quantity = Decimal(str(qty or 1))
    picket = Decimal(str(lf_picket or 0))
    mesh = Decimal(str(lf_mesh or 0))
    grab = Decimal(str(lf_grabrail or 0))
    wall = Decimal(str(lf_wallrail or 0))
    landings = Decimal(str(num_landings or 0))

    # Risers stringer weight coefficient
    if stair_type == "picket_rail":
        coef = Decimal("26.2")
    elif stair_type == "mesh_rail":
        coef = Decimal("21.2")
    elif stair_type == "heavy_rail":
        coef = Decimal("41.4")
    elif stair_type == "ts_rail":
        coef = Decimal("42.84")
    elif stair_type == "mesh_heavy_rail":
        coef = Decimal("41.4")
    elif stair_type == "no_rail":
        coef = Decimal("21.2")
    else:
        coef = Decimal("26.2")

    risers_weight = (Decimal("2") * risers * Decimal("4.35") + coef) * quantity
    picket_weight = picket * Decimal("17.00")
    mesh_weight = mesh * Decimal("6.81")
    grab_weight = grab * Decimal("2.27")
    wall_weight = wall * Decimal("2.27")
    
    landing_coef = Decimal("18.00") if stair_type == "heavy_rail" else Decimal("15.00")
    landing_weight = landings * landing_coef

    return risers_weight + picket_weight + mesh_weight + grab_weight + wall_weight + landing_weight


def compute_stair_flight(stair_flight, rate_config) -> dict:
    """
    Compute shop hrs, field hrs, material cost, and total for a stair flight.
    """
    q = Decimal(str(stair_flight.quantity or 1))
    risers = Decimal(str(stair_flight.num_risers or 0))
    lf_picket = Decimal(str(stair_flight.lf_picket or 0))
    lf_mesh = Decimal(str(stair_flight.lf_mesh or 0))
    lf_grabrail = Decimal(str(stair_flight.lf_grabrail or 0))
    lf_wallrail = Decimal(str(stair_flight.lf_wallrail or 0))
    num_landings = Decimal(str(stair_flight.num_landings or 0))

    # Shop labor hours (Risers sl is q * riser_sl, not risers * q * riser_sl!)
    sl_hrs = (
        q * LABOR_RATES["riser_sl"]
        + lf_picket * LABOR_RATES["picket_sl"]
        + lf_grabrail * LABOR_RATES["grabrail_sl"]
        + lf_wallrail * LABOR_RATES["wallrail_sl"]
        + num_landings * LABOR_RATES["landing_sl"]
        + lf_mesh * LABOR_RATES["mesh_sl"]
    )

    # Field labor hours
    fl_hrs = (
        q * LABOR_RATES["riser_fl"]
        + lf_picket * LABOR_RATES["picket_fl"]
        + lf_grabrail * LABOR_RATES["grabrail_fl"]
        + lf_wallrail * LABOR_RATES["wallrail_fl"]
        + num_landings * LABOR_RATES["landing_fl"]
        + lf_mesh * LABOR_RATES["mesh_fl"]
    )

    # Material lbs, then cost (MIS-011)
    mat_lbs = stair_material_lbs(
        stair_flight.stair_type, 
        int(risers), 
        int(q), 
        lf_picket, 
        lf_mesh, 
        lf_grabrail, 
        lf_wallrail, 
        num_landings
    )
    material_lbs_rate = Decimal(str(rate_config.material_lbs_rate))  # default $0.55/lb
    material_cost = (mat_lbs * material_lbs_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # Mesh subcontract cost (Z16 = length * 37)
    mesh_subcontract = lf_mesh * Decimal("37.00")

    # Total (MIS-012)
    stair_labor_rate = Decimal(str(rate_config.stair_labor_rate))  # default $65
    total = ((sl_hrs + fl_hrs) * stair_labor_rate + material_cost + mesh_subcontract).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

    return {
        "stair_type": stair_flight.stair_type,
        "quantity": int(stair_flight.quantity),
        "num_risers": stair_flight.num_risers,
        "sl_hrs": float(sl_hrs.quantize(Decimal("0.01"))),
        "fl_hrs": float(fl_hrs.quantize(Decimal("0.01"))),
        "mat_lbs": float(mat_lbs.quantize(Decimal("0.01"))),
        "material_cost": float(material_cost),
        "mesh_subcontract": float(mesh_subcontract),
        "total": float(total),
    }


def compute_misc_item(item) -> dict:
    """
    Compute SL hrs, FL hrs, and material value for a misc item.
    """
    qty = Decimal(str(item.quantity or 0))
    sl_hrs = (qty * Decimal(str(item.shop_rate or 0))).quantize(Decimal("0.01"))
    fl_hrs = (qty * Decimal(str(item.field_rate or 0))).quantize(Decimal("0.01"))
    material_value = (qty * Decimal(str(item.material_rate or 0))).quantize(Decimal("0.01"))

    return {
        "category": item.category,
        "description": item.description,
        "quantity": float(qty),
        "sl_hrs": float(sl_hrs),
        "fl_hrs": float(fl_hrs),
        "material_value": float(material_value),
        "unit_weight": float(item.unit_weight or 0),
        "is_galvanized": item.is_galvanized,
        "is_anodized": item.is_anodized,
        "is_powder_coated": item.is_powder_coated,
        "is_subcontract": item.is_subcontract,
        "subcontract_amount": float(item.subcontract_amount or 0),
    }


def compute_misc_metals_totals(misc_estimate, rate_config) -> dict:
    """Aggregate totals across all stairs and misc items."""
    stair_rows = []
    total_sl_hrs = Decimal("0")
    total_fl_hrs = Decimal("0")
    total_material = Decimal("0")
    total_subcontract = Decimal("0")
    total_mesh_subcontract = Decimal("0")

    for stair in misc_estimate.stair_flights.all():
        row = compute_stair_flight(stair, rate_config)
        row["line_id"] = stair.id
        stair_rows.append(row)
        total_sl_hrs += Decimal(str(row["sl_hrs"]))
        total_fl_hrs += Decimal(str(row["fl_hrs"]))
        total_material += Decimal(str(row["material_cost"]))
        total_mesh_subcontract += Decimal(str(row.get("mesh_subcontract", 0)))

    item_rows = []
    total_grating_value = Decimal("0")
    total_anodizing_value = Decimal("0")
    total_pc_value = Decimal("0")
    galv_lbs = Decimal("0")
    galv_cost = Decimal("0")

    for item in misc_estimate.items.all():
        row = compute_misc_item(item)
        row["line_id"] = item.id
        item_rows.append(row)

        qty = Decimal(str(item.quantity or 0))
        unit_w = Decimal(str(item.unit_weight or 0))
        item_w = qty * unit_w
        
        # Nosings: shop hours is 1.0 fixed if qty > 0
        sl_hrs = Decimal(str(row["sl_hrs"]))
        if "nosing" in item.description.lower() and qty > 0:
            sl_hrs = Decimal("1.0")
            row["sl_hrs"] = 1.0

        total_sl_hrs += sl_hrs
        total_fl_hrs += Decimal(str(row["fl_hrs"]))

        mat_val = Decimal(str(row["material_value"]))
        total_material += mat_val

        # Grating finish cost: sump pit has $60/pc grating cost
        if item.category == "grating" or "grating" in item.description.lower() or "sump pit" in item.description.lower():
            total_grating_value += qty * Decimal("60.00")

        # Anodizing finish cost = qty * $7.31/LF
        if item.is_anodized or "anodized" in item.description.lower():
            total_anodizing_value += qty * Decimal("7.31")

        # Powder coating finish cost = qty * $5.20/LF
        if item.is_powder_coated or "powder coated" in item.description.lower() or "p.c." in item.description.lower():
            total_pc_value += qty * Decimal("5.20")

        # Galvanizing:
        if item.is_galvanized or "galv" in item.description.lower():
            desc = item.description.lower()
            if "picket" in desc:
                item_galv_rate = Decimal("0.50")
            elif "bollard" in desc or "lintel" in desc:
                item_galv_rate = Decimal("0.30")
            elif "ladder" in desc or "wallrail" in desc or "1-line" in desc or "2-line" in desc or "3-line" in desc:
                item_galv_rate = Decimal("0.70")
            else:
                item_galv_rate = Decimal(str(rate_config.galv_unit_price))

            g_w = item_w * Decimal("1.05")
            g_c = g_w * item_galv_rate

            # Bollards are excluded from U158 weight, but included in Z158 cost
            if "bollard" not in desc:
                galv_lbs += g_w
            
            galv_cost += g_c

        if item.is_subcontract:
            total_subcontract += Decimal(str(item.subcontract_amount or 0))

    # Other value is powder coating value in Excel sheet
    other_value = total_pc_value

    stair_weight = sum(Decimal(str(r["mat_lbs"])) for r in stair_rows)
    item_weight = sum(Decimal(str(item.quantity or 0)) * Decimal(str(item.unit_weight or 0)) for item in misc_estimate.items.all())
    total_weight_lbs = stair_weight + item_weight

    return {
        "stair_rows": stair_rows,
        "item_rows": item_rows,
        "total_shop_hrs": float(total_sl_hrs.quantize(Decimal("0.01"))),
        "total_field_hrs": float(total_fl_hrs.quantize(Decimal("0.01"))),
        "total_material": float(total_material.quantize(Decimal("0.01"))),
        "total_subcontract": float(total_subcontract.quantize(Decimal("0.01"))),
        "grating_value": float(total_grating_value.quantize(Decimal("0.01"))),
        "anodizing_value": float(total_anodizing_value.quantize(Decimal("0.01"))),
        "pc_value": float(total_pc_value.quantize(Decimal("0.01"))),
        "galv_lbs": float(galv_lbs.quantize(Decimal("0.01"))),
        "galv_cost": float(galv_cost.quantize(Decimal("0.01"))),
        "other_value": float(other_value.quantize(Decimal("0.01"))),
        "total_mesh_subcontract": float(total_mesh_subcontract.quantize(Decimal("0.01"))),
        "total_weight_lbs": float(total_weight_lbs.quantize(Decimal("0.01"))),
    }

