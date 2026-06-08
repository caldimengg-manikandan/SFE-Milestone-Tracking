"""
Field Moment Connection models — Sheet 4.

AISCSection is a seeded read-only reference table (~200 W-shapes).
All hour values are computed at runtime (FMC-003 through FMC-007).

Business formulas (in services.py):
  FMC-003: bf_x_tf = bf * tf
  FMC-004: shop_hrs_flange = bf_x_tf / flange_constant (default 4.38)
  FMC-005: field_hrs_flange = shop_hrs_flange * field_factor (default 1.40)
  FMC-006: field_hrs_both = MROUND(field_hrs_flange * 2, 0.5)
  FMC-007: field_hours_total = qty * field_hrs_both
"""
from django.db import models
from projects.models import Project


class AISCSection(models.Model):
    """
    AISC W-shape section catalog — seeded, read-only (OQ-AISC: Admin UI for updates).
    label format: W##X### e.g. W14X82, W36X150
    bf = flange width (inches), tf = flange thickness (inches)
    """
    label = models.CharField(max_length=30, unique=True)
    bf = models.DecimalField(max_digits=8, decimal_places=4, help_text="Flange width (in)")
    tf = models.DecimalField(max_digits=8, decimal_places=4, help_text="Flange thickness (in)")

    class Meta:
        ordering = ["label"]
        indexes = [models.Index(fields=["label"])]

    def __str__(self):
        return f"{self.label} (bf={self.bf}, tf={self.tf})"


class FieldMomentConnTakeoff(models.Model):
    """One-to-one with Project."""
    project = models.OneToOneField(
        Project, on_delete=models.CASCADE, related_name="field_moment_conn_takeoff"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Field Moment Connection Takeoff"

    def __str__(self):
        return f"FMC Takeoff for {self.project.job_number}"


class FieldMomentConnLine(models.Model):
    """One row per AISC section selected. Qty entered by user; hours computed."""
    takeoff = models.ForeignKey(
        FieldMomentConnTakeoff, on_delete=models.CASCADE, related_name="lines"
    )
    aisc_section = models.ForeignKey(
        AISCSection, on_delete=models.PROTECT, related_name="fmc_lines"
    )
    quantity = models.IntegerField(default=0)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.aisc_section.label} × {self.quantity}"
