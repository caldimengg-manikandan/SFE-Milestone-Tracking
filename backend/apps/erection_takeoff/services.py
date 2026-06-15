"""
Erection Takeoff business logic service.
Converts the Excel Erection Take-Off sheet formulas exactly.
"""
import math
from decimal import Decimal, ROUND_HALF_UP


MEMBER_TO_CATEGORY = {
    # Structural Steel
    "COL": "Structural Steel",
    "BEAM": "Structural Steel",
    "GIRT": "Structural Steel",
    "SAG": "Structural Steel",
    "RF": "Structural Steel",
    "CA": "Structural Steel",
    "CR": "Structural Steel",
    # X-Bracing
    "DAB": "X-Bracing",
    "DAW": "X-Bracing",
    "TAB": "X-Bracing",
    "TAW": "X-Bracing",
    "VQR": "X-Bracing",
    "HQR": "X-Bracing",
    # Perimeter Plates & Angles
    "PA": "Perimeter Plates & Angles",
    "PAL": "Perimeter Plates & Angles",
    "PAL2": "Perimeter Plates & Angles",
    "PAL5": "Perimeter Plates & Angles",
    "WAL_L": "Perimeter Plates & Angles",
    "WAL_M": "Perimeter Plates & Angles",
    "WAL_H": "Perimeter Plates & Angles",
    "HAS": "Perimeter Plates & Angles",
    "SBFC": "Perimeter Plates & Angles",
    "MSA": "Perimeter Plates & Angles",
    "TSA_CLIPS": "Perimeter Plates & Angles",
    "BSA": "Perimeter Plates & Angles",
    # Moments & Miscellaneous
    "MOMENTS": "Moments & Miscellaneous",
    "MISC": "Moments & Miscellaneous",
    # Bolts & Anchors
    "BOLTS": "Bolts & Anchors",
    "EXP_BOLTS": "Bolts & Anchors",
    "ADH_ANCHORS": "Bolts & Anchors",
    # Joist Take-off
    "SSJ_0_10": "Joist Take-off",
    "SSJ_10_25": "Joist Take-off",
    "SSJ_25_35": "Joist Take-off",
    "SSJ_35_50": "Joist Take-off",
    "LSJ_30_40": "Joist Take-off",
    "LSJ_40_50": "Joist Take-off",
    "LSJ_50_60": "Joist Take-off",
    "LSJ_60_70": "Joist Take-off",
    "LSJ_70_80": "Joist Take-off",
    "LSJ_80_100": "Joist Take-off",
    "LSJ_GIR": "Joist Take-off",
    "JOIST_SPLICES": "Joist Take-off",
    "BOLTED_X_BRIDGING": "Joist Take-off",
    "WELDED_X_BRIDGING": "Joist Take-off",
    "HORIZ_BRIDGING": "Joist Take-off",
    "BRIDGING_WALL": "Joist Take-off",
    # Decking Take-off
    "DECK_15_18_ROOF": "Decking Take-off",
    "DECK_15_20_ROOF": "Decking Take-off",
    "DECK_15_22_ROOF": "Decking Take-off",
    "DECK_3_20_ROOF": "Decking Take-off",
    "DECK_15_20_COMP": "Decking Take-off",
    "DECK_15_22_COMP": "Decking Take-off",
    "DECK_2_20_COMP": "Decking Take-off",
    "DECK_916_26": "Decking Take-off",
    "DECK_CEL_15_18_18": "Decking Take-off",
    "DECK_CEL_15_18_20": "Decking Take-off",
    "DECK_CEL_15_20_18": "Decking Take-off",
    "DECK_CEL_15_20_20": "Decking Take-off",
    "DECK_CEL_2_18_18": "Decking Take-off",
    "DECK_CEL_2_18_20": "Decking Take-off",
    "DECK_CEL_2_20_18": "Decking Take-off",
    "DECK_CEL_2_20_20": "Decking Take-off",
}


def mround(value: Decimal, multiple: Decimal) -> Decimal:
    """
    Excel's MROUND — round to nearest multiple.
    """
    if not multiple or multiple == Decimal("0"):
        return value
    return Decimal(str(round(float(value) / float(multiple)) * float(multiple)))


def evaluate_crane_picks(formula: str, qty: Decimal) -> Decimal:
    """
    Evaluate a crane picks formula token against a quantity.
    Returns crane picks as Decimal.
    """
    qty = Decimal(str(qty or 0))
    formula = formula.strip().lower().replace(" ", "")

    if formula == "0":
        return Decimal("0")
    elif formula == "qty":
        return qty
    elif formula.startswith("deck:"):
        # deck:weight:divisor
        parts = formula.split(":")
        weight = Decimal(parts[1])
        divisor = Decimal(parts[2])
        return ((qty * weight) / divisor).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
    elif formula.startswith("qty/"):
        divisor = Decimal(formula.split("/")[1])
        return (qty / divisor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    elif formula.startswith("qty*"):
        multiplier = Decimal(formula.split("*")[1])
        return (qty * multiplier).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    else:
        return qty


def compute_member_row(line, project=None) -> dict:
    """
    Compute IW hours and crane picks for a single member line.
    """
    qty = Decimal(str(line.quantity or 0))
    mh_per_pc = Decimal(str(line.mh_per_pc or 0))
    input_unit = line.input_unit
    crane_picks_formula = line.crane_picks_formula or "qty"
    member_code = line.member_type.member_code if line.member_type else ""

    if input_unit == "sf":
        # Decking: Hours = Quantity / Factor
        if mh_per_pc > 0:
            iw_hours = (qty / mh_per_pc).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        else:
            iw_hours = Decimal("0")
    elif member_code == "MOMENTS":
        # Moments hours are pulled from FMC
        if project:
            from apps.field_moment_conn.models import FieldMomentConnTakeoff
            from apps.field_moment_conn.services import compute_fmc_totals
            try:
                fmc_takeoff = project.field_moment_conn_takeoff
                fmc_totals = compute_fmc_totals(fmc_takeoff, project.rate_config)
                iw_hours = Decimal(str(fmc_totals["grand_total_field_hours"]))
            except Exception:
                iw_hours = Decimal("0")
        else:
            iw_hours = Decimal("0")
    else:
        # Standard: Hours = Quantity * Factor
        iw_hours = (qty * mh_per_pc).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    crane_picks = evaluate_crane_picks(crane_picks_formula, qty)

    return {
        "quantity": qty,
        "iw_hours": iw_hours,
        "crane_picks": crane_picks,
        "mh_per_pc": mh_per_pc,
        "member_code": member_code,
        "label": line.label,
        "input_unit": input_unit,
    }


def compute_erection_totals(erection_takeoff, rate_config, bid_summary):
    """
    Compute all derived values for an ErectionTakeoff instance.
    Returns a flat dict of computed totals.
    """
    # Fetch all member lines for this takeoff
    lines = list(erection_takeoff.member_lines.all().select_related("member_type").order_by("sort_order", "id"))

    row_data = []
    total_iw_hours = Decimal("0")
    total_crane_picks = Decimal("0")

    for line in lines:
        row = compute_member_row(line, project=erection_takeoff.project)
        row["line_id"] = line.id
        row_data.append(row)
        total_iw_hours += row["iw_hours"]
        total_crane_picks += row["crane_picks"]

    # Sum deck tons for unload trucks calculation (exclude DECK_15_18_ROOF to match SUM(M59:M76) in Excel)
    decking_tonnage_sum = Decimal("0")
    for line, r in zip(lines, row_data):
        is_decking = line.category == "Decking Take-off"
        is_excl = line.member_type and line.member_type.member_code == "DECK_15_18_ROOF"
        if is_decking and not is_excl:
            decking_tonnage_sum += Decimal(str(r["crane_picks"]))
    # Helper to fetch from estimation Sections of Project if available
    project = erection_takeoff.project
    est_sec = project.estimation_data.get("estimationSections", {}) if (project and project.estimation_data) else {}

    def get_val(key, bid_val):
        val = est_sec.get(key)
        if val is not None and str(val).strip() != '':
            try:
                return Decimal(str(val))
            except Exception:
                pass
        return Decimal(str(bid_val or 0))

    # Unload Trucks inputs from Bid Summary or Project estimation Sections
    freight_out_trucks = get_val("numTrucks", bid_summary.freight_out_trucks if bid_summary else 0)
    joist_deck_tons = get_val("steelJoistTons", bid_summary.joist_deck_tons if bid_summary else 0)

    # A6 Unload Trucks: ROUNDUP(freight_out_trucks + joist_deck_tons/10 + decking_tonnage_sum/10, 0)
    unload_trucks_raw = freight_out_trucks + (joist_deck_tons / Decimal("10")) + (decking_tonnage_sum / Decimal("10"))
    unload_trucks = math.ceil(float(unload_trucks_raw))
    
    # O6 Unload Hours: trucks * 2
    unload_hours = Decimal(str(unload_trucks)) * Decimal("2")

    # Add unload picks to total crane picks (since M6 = A6*5 in Excel is included in SUM(M6:M78))
    total_crane_picks += Decimal(str(unload_trucks)) * Decimal("5")

    # Raw Total Hours (O80)
    total_raw_hours = total_iw_hours + unload_hours

    # Crew constants
    crew_size = erection_takeoff.crew_size or 5
    picks_per_day = erection_takeoff.picks_per_day or 35
    efficiency = Decimal(str(rate_config.efficiency_factor or "0.50")) if rate_config else Decimal("0.50")

    # O81: Total Crew Days = (total_raw_hours / crew_size) / 8
    crew_days_raw = (total_raw_hours / Decimal(str(crew_size))) / Decimal("8")
    # O82: Days Rounded Up
    crew_days_rounded = math.ceil(float(crew_days_raw))
    # O83: Total Scheduled Hours
    total_scheduled_hours = Decimal(str(crew_days_rounded * 8 * crew_size))

    # A82: Foreman Hours (User entered override)
    foreman_hours = Decimal(str(erection_takeoff.foreman_hours or 0))
    # A84: Ironworker Hours
    ironworker_hours = max(Decimal("0"), total_scheduled_hours - foreman_hours)

    # Labor Cost Rates
    foreman_rate = Decimal(str(erection_takeoff.foreman_rate))
    ironworker_rate = Decimal(str(erection_takeoff.ironworker_rate))

    # Labor Costs
    foreman_cost = foreman_hours * foreman_rate
    ironworker_cost = ironworker_hours * ironworker_rate

    # Crane Days and Cost
    crane_days = float(total_crane_picks) / picks_per_day if picks_per_day > 0 else 0
    crane_hours = mround(Decimal(str(crane_days * 8)), Decimal("8"))
    crane_cost = crane_hours * Decimal(str(erection_takeoff.crane_rate))

    # Equipment Rental Cost (from field default or override)
    equipment_rental = Decimal(str(erection_takeoff.equipment_rental if erection_takeoff.equipment_rental is not None else 0))

    # Studs Cost
    field_studs_qty = Decimal(str(erection_takeoff.field_studs_qty or 0))
    field_studs_cost = field_studs_qty * Decimal(str(erection_takeoff.field_studs_rate))

    # Perimeter Cable Costs
    perimeter_cable_qty = Decimal(str(erection_takeoff.perimeter_cable_qty if erection_takeoff.perimeter_cable_qty is not None else 0))
    cable_material_cost = perimeter_cable_qty * Decimal(str(erection_takeoff.perimeter_cable_material_rate))
    cable_shop_labor_cost = perimeter_cable_qty * Decimal(str(erection_takeoff.perimeter_cable_shop_rate))
    cable_field_labor_hours = math.ceil(float(perimeter_cable_qty) / 20.0)
    cable_field_labor_cost = Decimal(str(cable_field_labor_hours)) * Decimal(str(erection_takeoff.perimeter_cable_field_rate))

    # Travel & Per Diem
    travel_hours = get_val("hoursPerTruck", bid_summary.freight_out_hours_each if bid_summary else 0)
    # D96 Overnight flag
    is_overnight = "yes" if (travel_hours - Decimal("2")) > Decimal("4") else "no"

    foreman_days = foreman_hours / Decimal("8")

    if is_overnight == "no":
        travel_driver_cost = max(Decimal("0"), travel_hours - Decimal("2")) * foreman_days * Decimal(str(erection_takeoff.travel_driver_rate))
        travel_passenger_cost = (max(Decimal("0"), travel_hours - Decimal("2")) / Decimal("2")) * foreman_days * Decimal(str(erection_takeoff.travel_passenger_rate)) * Decimal(str(crew_size - 1))
        per_diem_cost = Decimal("0")
        weeks_driver_travel_cost = Decimal("0")
        weeks_passenger_travel_cost = Decimal("0")
        num_weeks = 0
    else:
        travel_driver_cost = Decimal("0")
        travel_passenger_cost = Decimal("0")
        num_weeks = math.ceil(float(total_scheduled_hours) / 40.0 / crew_size)
        per_diem_cost = Decimal(str(erection_takeoff.per_diem_rate)) * foreman_days * Decimal(str(crew_size))
        weeks_driver_travel_cost = Decimal(str(erection_takeoff.weeks_travel_driver_rate)) * max(Decimal("0"), travel_hours - Decimal("2")) * Decimal(str(num_weeks)) if travel_hours > 6 else Decimal("0")
        weeks_passenger_travel_cost = Decimal(str(erection_takeoff.weeks_travel_passenger_rate)) * (max(Decimal("0"), travel_hours - Decimal("2")) / Decimal("2")) * Decimal(str(num_weeks)) * Decimal(str(crew_size - 1)) if travel_hours > 6 else Decimal("0")

    # Erection take-off total cost (G101)
    total_erection_cost = (
        foreman_cost
        + ironworker_cost
        + crane_cost
        + equipment_rental
        + field_studs_cost
        + cable_material_cost
        + cable_shop_labor_cost
        + cable_field_labor_cost
        + travel_driver_cost
        + travel_passenger_cost
        + per_diem_cost
        + weeks_driver_travel_cost
        + weeks_passenger_travel_cost
    )

    return {
        "rows": row_data,
        "total_iw_hours": float(total_iw_hours),
        "total_crane_picks": float(total_crane_picks),
        "freight_out_trucks": float(freight_out_trucks),
        "joist_deck_tons": float(joist_deck_tons),
        "decking_tonnage_sum": float(decking_tonnage_sum),
        "unload_trucks": unload_trucks,
        "unload_hours": float(unload_hours),
        "total_raw_hours": float(total_raw_hours),
        
        "picks_per_day": picks_per_day,
        "efficiency_factor": float(efficiency),
        "crew_size": crew_size,
        "crew_days_raw": float(crew_days_raw),
        "crew_days_rounded": crew_days_rounded,
        "total_scheduled_hours": float(total_scheduled_hours),
        
        "foreman_hours": float(foreman_hours),
        "ironworker_hours": float(ironworker_hours),
        "foreman_cost": float(foreman_cost),
        "ironworker_cost": float(ironworker_cost),
        
        "crane_days": round(crane_days, 2),
        "crane_hours": float(crane_hours),
        "crane_cost": float(crane_cost),
        
        "equipment_rental": float(equipment_rental),
        "field_studs_qty": float(field_studs_qty),
        "field_studs_cost": float(field_studs_cost),
        
        "perimeter_cable_qty": float(perimeter_cable_qty),
        "cable_material_cost": float(cable_material_cost),
        "cable_shop_labor_cost": float(cable_shop_labor_cost),
        "cable_field_labor_hours": cable_field_labor_hours,
        "cable_field_labor_cost": float(cable_field_labor_cost),
        
        "travel_hours": float(travel_hours),
        "is_overnight": is_overnight,
        "num_weeks": num_weeks,
        "travel_driver_cost": float(travel_driver_cost),
        "travel_passenger_cost": float(travel_passenger_cost),
        "per_diem_cost": float(per_diem_cost),
        "weeks_driver_travel_cost": float(weeks_driver_travel_cost),
        "weeks_passenger_travel_cost": float(weeks_passenger_travel_cost),
        
        "total_erection_cost": float(total_erection_cost),
        "foreman_rate": float(foreman_rate),
        "ironworker_rate": float(ironworker_rate),
        "crane_rate": float(erection_takeoff.crane_rate),
        "field_studs_rate": float(erection_takeoff.field_studs_rate),
        "perimeter_cable_material_rate": float(erection_takeoff.perimeter_cable_material_rate),
        "perimeter_cable_shop_rate": float(erection_takeoff.perimeter_cable_shop_rate),
        "perimeter_cable_field_rate": float(erection_takeoff.perimeter_cable_field_rate),
        "travel_driver_rate": float(erection_takeoff.travel_driver_rate),
        "travel_passenger_rate": float(erection_takeoff.travel_passenger_rate),
        "per_diem_rate": float(erection_takeoff.per_diem_rate),
        "weeks_travel_driver_rate": float(erection_takeoff.weeks_travel_driver_rate),
        "weeks_travel_passenger_rate": float(erection_takeoff.weeks_travel_passenger_rate),
    }
