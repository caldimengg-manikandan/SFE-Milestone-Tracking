"""Misc Metals admin registrations."""
from django.contrib import admin
from apps.misc_metals.models import MiscMetalsEstimate, StairFlight, MiscMetalsItem


class StairFlightInline(admin.TabularInline):
    model = StairFlight
    extra = 1


class MiscMetalsItemInline(admin.TabularInline):
    model = MiscMetalsItem
    extra = 1


@admin.register(MiscMetalsEstimate)
class MiscMetalsEstimateAdmin(admin.ModelAdmin):
    list_display = ("project", "updated_at")
    search_fields = ("project__code", "project__name")
    inlines = [StairFlightInline, MiscMetalsItemInline]
