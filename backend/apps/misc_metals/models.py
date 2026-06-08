"""
Misc Metals models — Sheet 5.

Handles stairs, railings, grating, ladders, platforms, etc.

Business rules implemented in services.py:
  MIS-001–004: Stair material by type
  MIS-005–010: Component labor + material rates
  MIS-011: material_cost = rate * qty * $0.55/lb (material_lbs_rate)
  MIS-012: stair_total = (SL_hrs + FL_hrs) * $65 + material_cost
  MIS-013: Misc items: qty * (shop_rate + field_rate + material_rate)
"""
from django.db import models
from projects.models import Project


class MiscMetalsEstimate(models.Model):
    """One-to-one with Project."""
    project = models.OneToOneField(
        Project, on_delete=models.CASCADE, related_name="misc_metals_estimate"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Misc Metals Estimate"

    def __str__(self):
        return f"MiscMetals for {self.project.job_number}"


class StairFlight(models.Model):
    """
    A single stair flight with all components (MIS-001–012).
    Stair type determines the material rate formula.
    """
    class StairType(models.TextChoices):
        PICKET_RAIL = "picket_rail", "Stair w/ Picket Rail (MC12×10.6)"
        MESH_RAIL = "mesh_rail", "Stair w/ Mesh Rail (MC12×10.6)"
        HEAVY_RAIL = "heavy_rail", "Stair w/ Rail Heavy (MC12×20.7)"
        TS_RAIL = "ts_rail", "Stair w/ Rail TS (TS12×2×1/4)"
        MESH_HEAVY_RAIL = "mesh_heavy_rail", "Stair w/ Mesh Rail Heavy (MC12×20.7)"
        NO_RAIL = "no_rail", "Stair (MC12×10.6)"

    estimate = models.ForeignKey(
        MiscMetalsEstimate, on_delete=models.CASCADE, related_name="stair_flights"
    )
    stair_type = models.CharField(max_length=20, choices=StairType.choices, default=StairType.PICKET_RAIL)
    quantity = models.IntegerField(default=1)
    num_risers = models.IntegerField(default=0)
    lf_picket = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    lf_mesh = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    lf_grabrail = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    lf_wallrail = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    num_landings = models.IntegerField(default=0)
    description = models.CharField(max_length=200, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.get_stair_type_display()} × {self.quantity} ({self.num_risers} risers)"


class MiscMetalsItem(models.Model):
    """
    General misc metals items: grating, ladders, platforms, etc. (MIS-013).
    Each item: qty * shop_rate = SL, qty * field_rate = FL, qty * material_rate = mat.
    """
    class Category(models.TextChoices):
        GRATING = "grating", "Grating"
        LADDER = "ladder", "Ladders"
        PLATFORM = "platform", "Platforms"
        SAFETY_CAGE = "safety_cage", "Safety Cages"
        BOLLARD = "bollard", "Bollards"
        HATCH_FRAME = "hatch_frame", "Hatch Frames"
        RAILING = "railing", "Railings"
        OTHER = "other", "Other"

    estimate = models.ForeignKey(
        MiscMetalsEstimate, on_delete=models.CASCADE, related_name="items"
    )
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    description = models.CharField(max_length=300)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shop_rate = models.DecimalField(max_digits=10, decimal_places=4, default=0, help_text="Shop hrs per unit")
    field_rate = models.DecimalField(max_digits=10, decimal_places=4, default=0, help_text="Field hrs per unit")
    material_rate = models.DecimalField(max_digits=10, decimal_places=4, default=0, help_text="Material $ per unit")
    unit_weight = models.DecimalField(max_digits=12, decimal_places=4, default=0, help_text="Lbs per unit")
    is_galvanized = models.BooleanField(default=False)
    is_anodized = models.BooleanField(default=False)
    is_powder_coated = models.BooleanField(default=False)
    is_subcontract = models.BooleanField(default=False)
    subcontract_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    sort_order = models.PositiveIntegerField(default=0)


    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.category}: {self.description} × {self.quantity}"
