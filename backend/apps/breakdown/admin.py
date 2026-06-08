"""Breakdown admin registrations."""
from django.contrib import admin
from apps.breakdown.models import BreakdownAnnotation


@admin.register(BreakdownAnnotation)
class BreakdownAnnotationAdmin(admin.ModelAdmin):
    list_display = ("project", "item_ref", "detailer", "mat_ordered", "erected", "updated_by", "updated_at")
    list_filter = ("mat_ordered", "erected")
    search_fields = ("project__code", "item_ref", "detailer")
