"""
EstimateData models — Sheet 7.

EstimateSnapshot: immutable record created on "Finalize Estimate" (AS-08).
ScheduleOfValuesLine: the 7 SOV items (Bond, Drawings, Steel, Joist, Deck, Misc, Erection).
"""
from django.conf import settings
from django.db import models
from projects.models import Project


class ScheduleOfValuesLine(models.Model):
    """SOV items 50–600 (EST-015). 7 standard lines per project."""

    class SOVCode(models.TextChoices):
        BOND = "50", "Bond"
        DRAWINGS = "100", "Drawings"
        STEEL = "200", "Steel"
        JOIST = "300", "Joist"
        DECK = "400", "Deck"
        MISC = "500", "Miscellaneous Metals"
        ERECTION = "600", "Erection"

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="sov_lines"
    )
    code = models.CharField(max_length=10, choices=SOVCode.choices)
    description = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        unique_together = [("project", "code")]
        ordering = ["code"]

    def __str__(self):
        return f"SOV {self.code} — {self.description}: ${self.amount}"


class EstimateSnapshot(models.Model):
    """
    Immutable snapshot created when "Finalize Estimate" is clicked (AS-08).
    Once created, this record is NEVER modified.
    Corrections → "Clone to New Revision" creates a new draft project copy.
    """
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="snapshots"
    )
    version_number = models.PositiveIntegerField()
    preparer_name = models.CharField(max_length=200)
    prevailing_wage = models.BooleanField(default=False)   # EST-016
    out_of_town = models.BooleanField(default=False)        # EST-017
    data_snapshot = models.JSONField()                      # Full computed cost codes at finalization
    finalized_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL
    )
    finalized_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("project", "version_number")]
        ordering = ["-version_number"]

    def __str__(self):
        return f"Snapshot v{self.version_number} — {self.project.code}"

    def save(self, *args, **kwargs):
        """Prevent modification after creation."""
        if self.pk:
            raise ValueError("EstimateSnapshot is immutable — create a new snapshot instead.")
        # Auto-assign version number
        if not self.version_number:
            last = EstimateSnapshot.objects.filter(project=self.project).order_by("-version_number").first()
            self.version_number = (last.version_number + 1) if last else 1
        super().save(*args, **kwargs)
