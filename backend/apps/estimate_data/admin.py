"""Estimate Data admin registrations."""
from django.contrib import admin
from apps.estimate_data.models import ScheduleOfValuesLine, EstimateSnapshot


@admin.register(ScheduleOfValuesLine)
class ScheduleOfValuesLineAdmin(admin.ModelAdmin):
    list_display = ("project", "code", "description", "amount")
    list_filter = ("code",)
    search_fields = ("project__code", "description")


@admin.register(EstimateSnapshot)
class EstimateSnapshotAdmin(admin.ModelAdmin):
    list_display = ("project", "version_number", "preparer_name", "prevailing_wage", "out_of_town", "finalized_by", "finalized_at")
    list_filter = ("prevailing_wage", "out_of_town")
    search_fields = ("project__code", "preparer_name")
