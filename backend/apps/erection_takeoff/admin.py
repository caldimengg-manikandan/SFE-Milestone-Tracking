"""Erection Takeoff admin registrations."""
from django.contrib import admin
from apps.erection_takeoff.models import ErectionTakeoff, MemberType, ErectionMemberLine


class ErectionMemberLineInline(admin.TabularInline):
    model = ErectionMemberLine
    extra = 1


@admin.register(MemberType)
class MemberTypeAdmin(admin.ModelAdmin):
    list_display = ("member_code", "label", "mh_per_pc", "crane_picks_formula", "input_unit", "sort_order")
    search_fields = ("member_code", "label")


@admin.register(ErectionTakeoff)
class ErectionTakeoffAdmin(admin.ModelAdmin):
    list_display = ("project", "picks_per_day", "efficiency_factor", "updated_at")
    search_fields = ("project__code", "project__name")
    inlines = [ErectionMemberLineInline]
