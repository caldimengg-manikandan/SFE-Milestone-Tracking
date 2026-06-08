"""
Breakdown models — Sheet 6.

BRK-001: Breakdown is a read-only computed view — NO main data model.
BRK-006: BreakdownAnnotation stores user annotations (detailer, mat ordered, erected).
"""
from django.conf import settings
from django.db import models
from projects.models import Project


class BreakdownAnnotation(models.Model):
    """
    Per-row annotation for the Breakdown view.
    item_ref is a string key identifying the row: e.g. 'structural_steel' or 'misc_item_42'.
    """
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="breakdown_annotations"
    )
    item_ref = models.CharField(max_length=100)
    detailer = models.CharField(max_length=200, blank=True)
    mat_ordered = models.BooleanField(default=False)
    erected = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("project", "item_ref")]
        ordering = ["item_ref"]

    def __str__(self):
        return f"Annotation [{self.item_ref}] for {self.project.code}"
