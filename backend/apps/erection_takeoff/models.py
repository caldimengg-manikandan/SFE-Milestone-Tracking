"""
Erection Takeoff models — Sheet 3.

MemberType is a seeded reference table (22 types) — never user-editable.
crane_picks_formula stores a string token (see services.py for evaluation).

Business rules implemented in services.py:
  ERT-001 to ERT-022: IW hours = qty * mh_per_pc per member type
  ERT-023: total_iw_hours = SUM of all member IW hours
  ERT-024: truck unload = ROUNDUP(beam_tons/18 + joist_tons/10 + misc_tons/10, 0)
  ERT-025: unload_hours = trucks * 3 * 2
  ERT-026: total_crane_picks = SUM of all member crane picks
  ERT-027: crane_days = total_crane_picks / picks_per_day
  ERT-028: picks_per_day user override
  ERT-029: efficiency_factor default 50%
  ERT-030: joist_tons, misc_tons for unload calc (GAP-001)
"""
from django.db import models
from projects.models import Project


class MemberType(models.Model):
    """
    Seeded reference table for all 22 structural member types.
    MH/PC factors and crane pick formulas are sourced directly from the Excel.
    crane_picks_formula tokens: 'qty', 'qty/10', 'qty/6', 'qty*2', etc.
    """
    member_code = models.CharField(max_length=20, unique=True)
    label = models.CharField(max_length=100)
    mh_per_pc = models.DecimalField(max_digits=10, decimal_places=4)
    crane_picks_formula = models.CharField(max_length=50, default="qty")
    input_unit = models.CharField(
        max_length=10,
        choices=[
            ("pc", "Piece"),
            ("lf", "Linear Feet"),
            ("sf", "Square Feet"),
            ("each", "Each"),
            ("set", "Set"),
            ("hrs", "Hours"),
        ],
        default="pc",
    )
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self):
        return f"{self.member_code}: {self.label} ({self.mh_per_pc} MH/PC)"


class ErectionTakeoff(models.Model):
    """One-to-one with Project. Stores override constants."""
    project = models.OneToOneField(
        Project, on_delete=models.CASCADE, related_name="erection_takeoff"
    )
    # User-overridable constants (ERT-027, ERT-028, ERT-029)
    picks_per_day = models.IntegerField(default=35)
    efficiency_factor = models.DecimalField(max_digits=4, decimal_places=2, default=0.50)
    crew_size = models.IntegerField(default=5)  # Q7 crew size
    foreman_hours = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # A82 foreman hours override
    field_studs_qty = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # A90 field studs quantity
    perimeter_cable_qty = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # A91 perimeter cable plan feet

    # Equipment Rental field (linked to cost code 2.05)
    equipment_rental = models.DecimalField(max_digits=12, decimal_places=2, default="0.00")

    # Editable rates for the self-perform costing sheet
    foreman_rate = models.DecimalField(max_digits=10, decimal_places=2, default=75.00)
    ironworker_rate = models.DecimalField(max_digits=10, decimal_places=2, default=65.00)
    crane_rate = models.DecimalField(max_digits=10, decimal_places=2, default=200.00)
    field_studs_rate = models.DecimalField(max_digits=10, decimal_places=2, default=2.50)
    perimeter_cable_material_rate = models.DecimalField(max_digits=10, decimal_places=2, default=5.00)
    perimeter_cable_shop_rate = models.DecimalField(max_digits=10, decimal_places=2, default=4.00)
    perimeter_cable_field_rate = models.DecimalField(max_digits=10, decimal_places=2, default=75.00)
    travel_driver_rate = models.DecimalField(max_digits=10, decimal_places=2, default=65.00)
    travel_passenger_rate = models.DecimalField(max_digits=10, decimal_places=2, default=65.00)
    per_diem_rate = models.DecimalField(max_digits=10, decimal_places=2, default=85.00)
    weeks_travel_driver_rate = models.DecimalField(max_digits=10, decimal_places=2, default=65.00)
    weeks_travel_passenger_rate = models.DecimalField(max_digits=10, decimal_places=2, default=65.00)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Erection Takeoff"
        verbose_name_plural = "Erection Takeoffs"

    def __str__(self):
        return f"ErectionTakeoff for {self.project.code}"


class ErectionMemberLine(models.Model):
    """
    One row per member type (or custom member) per project.
    Contains overrides for unit, MH factor, and picks formula.
    """
    erection_takeoff = models.ForeignKey(
        ErectionTakeoff, on_delete=models.CASCADE, related_name="member_lines"
    )
    member_type = models.ForeignKey(
        MemberType, on_delete=models.PROTECT, related_name="member_lines", null=True, blank=True
    )
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sort_order = models.PositiveIntegerField(default=0)

    # Overrides and custom item fields
    label = models.CharField(max_length=200, blank=True)
    input_unit = models.CharField(max_length=20, blank=True)
    mh_per_pc = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    crane_picks_formula = models.CharField(max_length=100, blank=True)
    is_custom = models.BooleanField(default=False)
    category = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ["sort_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["erection_takeoff", "member_type"],
                condition=models.Q(member_type__isnull=False),
                name="unique_member_type_per_takeoff"
            )
        ]

    def save(self, *args, **kwargs):
        if self.member_type:
            if not self.label:
                self.label = self.member_type.label
            if not self.input_unit:
                self.input_unit = self.member_type.input_unit
            if self.mh_per_pc is None:
                self.mh_per_pc = self.member_type.mh_per_pc
            if not self.crane_picks_formula:
                self.crane_picks_formula = self.member_type.crane_picks_formula
            if not self.category:
                from apps.erection_takeoff.services import MEMBER_TO_CATEGORY
                self.category = MEMBER_TO_CATEGORY.get(str(self.member_type.member_code), "")
            if not self.sort_order:
                self.sort_order = self.member_type.sort_order
        else:
            self.is_custom = True
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.label or 'Custom'}: qty={self.quantity}"
