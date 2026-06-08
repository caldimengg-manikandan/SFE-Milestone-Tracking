"""
FMC business logic service.

Implements AISC moment connection hour calculations from Sheet 4.

Traceability:
  FMC-003: bf_x_tf = bf * tf
  FMC-004: shop_hrs_flange = bf_x_tf / 4.38
  FMC-005: field_hrs_flange = shop_hrs_flange * 1.40
  FMC-006: field_hrs_both = MROUND(field_hrs_flange * 2, 0.5)
  FMC-007: field_hours_total = qty * field_hrs_both
"""
from decimal import Decimal, ROUND_HALF_UP


def mround(value: Decimal, multiple: Decimal) -> Decimal:
    """
    Excel's MROUND — round to nearest multiple.
    MROUND(5.6, 0.5) = 5.5 (nearest 0.5)
    Python equivalent: round(value / multiple) * multiple
    """
    if not multiple or multiple == Decimal("0"):
        return value
    return (round(float(value) / float(multiple)) * float(multiple))


def compute_fmc_row(aisc_section, quantity: int, rate_config) -> dict:
    """
    Compute all derived values for a single FMC line (FMC-003–007).
    Returns a dict of computed fields for the serializer.
    """
    bf = Decimal(str(aisc_section.bf))
    tf = Decimal(str(aisc_section.tf))
    qty = int(quantity or 0)

    flange_constant = Decimal(str(rate_config.flange_constant))  # default 4.38
    field_factor = Decimal(str(rate_config.field_factor))  # default 1.40

    # FMC-003
    bf_x_tf = (bf * tf).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)

    # FMC-004
    shop_hrs_flange = (bf_x_tf / flange_constant).quantize(
        Decimal("0.0001"), rounding=ROUND_HALF_UP
    )

    # FMC-005
    field_hrs_flange = (shop_hrs_flange * field_factor).quantize(
        Decimal("0.0001"), rounding=ROUND_HALF_UP
    )

    # FMC-006: MROUND to nearest 0.5 (round both flanges)
    if aisc_section.label == "HSS":
        field_hrs_both = Decimal("2.0")
    else:
        field_hrs_both_raw = field_hrs_flange * Decimal("2")
        field_hrs_both = Decimal(str(mround(field_hrs_both_raw, Decimal("0.5"))))

    # FMC-007
    field_hours_total = (Decimal(str(qty)) * field_hrs_both).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

    return {
        "label": aisc_section.label,
        "bf": float(bf),
        "tf": float(tf),
        "bf_x_tf": float(bf_x_tf),
        "shop_hrs_flange": float(shop_hrs_flange),
        "field_hrs_flange": float(field_hrs_flange),
        "field_hrs_both": float(field_hrs_both),
        "quantity": qty,
        "field_hours_total": float(field_hours_total),
    }


def compute_fmc_totals(fmc_takeoff, rate_config) -> dict:
    """Grand totals for the FMC module."""
    lines = list(fmc_takeoff.lines.select_related("aisc_section").all())
    rows = []
    grand_total_field_hours = 0.0

    for line in lines:
        row = compute_fmc_row(line.aisc_section, line.quantity, rate_config)
        row["line_id"] = line.id
        rows.append(row)
        grand_total_field_hours += row["field_hours_total"]

    return {
        "rows": rows,
        "grand_total_field_hours": round(grand_total_field_hours, 2),
    }
